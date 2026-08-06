import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const INDICATOR_FILE = path.resolve(HERE, '../dualSvpKeyLevels.js')

// --- Stubs del entorno de Tradovate -----------------------------------------

const predefStub = {
  paramSpecs: {
    bool: (def) => ({ type: 'bool', def }),
    number: (def, step, min) => ({ type: 'number', def, step, min }),
    color: (def) => ({ type: 'color', def }),
    enum: (options, def) => ({ type: 'enum', options, def }),
    period: (def) => ({ type: 'period', def }),
  },
  plotters: {
    custom: (fn) => ({ type: 'custom', fn }),
  },
  styles: { plot: (o) => o },
}

const metaStub = { InputType: { BARS: 'bars' } }

function loadIndicator() {
  const source = fs.readFileSync(INDICATOR_FILE, 'utf8')
  const requireStub = (id) => {
    if (id === './tools/predef') return predefStub
    if (id === './tools/meta') return metaStub
    throw new Error(`require no soportado en el sandbox de test: ${id}`)
  }
  const sandbox = { exports: {} }
  const factory = new Function('module', 'exports', 'require', source)
  factory(sandbox, sandbox.exports, requireStub)
  return sandbox.exports
}

function defaultProps(params) {
  const props = {}
  for (const key of Object.keys(params)) {
    props[key] = params[key].def
  }
  return props
}

function makeCalculator(indicator, overrides = {}) {
  const Calculator = indicator.calculator
  const instance = new Calculator()
  instance.props = { ...defaultProps(indicator.params), ...overrides }
  instance.init()
  return instance
}

// --- Generador de velas sinteticas ------------------------------------------

const MINUTE = 60 * 1000

/** LCG determinista, para que los tests no dependan de Math.random. */
function makeRandom(seed) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

function makeBar(index, ms, open, high, low, close, volume) {
  return {
    index: () => index,
    timestamp: () => new Date(ms),
    open: () => open,
    high: () => high,
    low: () => low,
    close: () => close,
    volume: () => volume,
  }
}

/**
 * Genera velas de 1 minuto continuas y devuelve, ademas, los extremos reales
 * de cada sesion para poder verificar el indicador contra ellos.
 */
function generateBars({ startMs, minutes, startPrice = 5000 }) {
  const random = makeRandom(42)
  const bars = []
  let price = startPrice
  for (let i = 0; i < minutes; i += 1) {
    const ms = startMs + i * MINUTE
    const open = price
    const move = (random() - 0.5) * 4
    const close = Math.round((open + move) * 4) / 4
    const high = Math.max(open, close) + Math.round(random() * 4) / 4
    const low = Math.min(open, close) - Math.round(random() * 4) / 4
    const volume = 50 + Math.round(random() * 500)
    bars.push(makeBar(i, ms, open, high, low, close, volume))
    price = close
  }
  return bars
}

/** Minutos desde medianoche en Nueva York (con DST) para un instante UTC. */
function nyMinutes(ms, internals) {
  return internals.exchangeTime(ms, true, -5).minutes
}

function runAll(instance, bars) {
  for (let i = 0; i < bars.length; i += 1) {
    instance.map(bars[i], i)
  }
  return instance
}

let indicator
let internals

beforeAll(() => {
  indicator = loadIndicator()
  internals = indicator._internals
})

// ============================================================================

describe('exports del indicador', () => {
  it('expone la forma que espera Tradovate', () => {
    expect(indicator.name).toBe('dualSvpKeyLevels')
    expect(typeof indicator.calculator).toBe('function')
    expect(indicator.inputType).toBe('bars')
    expect(indicator.plotter.type).toBe('custom')
    expect(typeof indicator.plotter.fn).toBe('function')
    expect(Object.keys(indicator.params).length).toBeGreaterThan(40)
  })

  it('define un default para cada parametro', () => {
    for (const [key, spec] of Object.entries(indicator.params)) {
      expect(spec.def, `parametro ${key}`).toBeDefined()
    }
  })
})

describe('zona horaria del exchange', () => {
  it('aplica EST fuera del horario de verano', () => {
    // 15 de enero de 2024, 12:00 UTC -> 07:00 NY
    expect(internals.easternOffsetHours(Date.UTC(2024, 0, 15, 12))).toBe(-5)
    expect(nyMinutes(Date.UTC(2024, 0, 15, 12), internals)).toBe(7 * 60)
  })

  it('aplica EDT durante el horario de verano', () => {
    // 15 de julio de 2024, 13:30 UTC -> 09:30 NY
    expect(internals.easternOffsetHours(Date.UTC(2024, 6, 15, 13, 30))).toBe(-4)
    expect(nyMinutes(Date.UTC(2024, 6, 15, 13, 30), internals)).toBe(9 * 60 + 30)
  })

  it('cambia exactamente en el 2do domingo de marzo y 1er domingo de noviembre', () => {
    // 2024: DST del 10-mar 07:00 UTC al 3-nov 06:00 UTC
    expect(internals.easternOffsetHours(Date.UTC(2024, 2, 10, 6, 59))).toBe(-5)
    expect(internals.easternOffsetHours(Date.UTC(2024, 2, 10, 7, 0))).toBe(-4)
    expect(internals.easternOffsetHours(Date.UTC(2024, 10, 3, 5, 59))).toBe(-4)
    expect(internals.easternOffsetHours(Date.UTC(2024, 10, 3, 6, 0))).toBe(-5)
  })

  it('permite un offset manual', () => {
    expect(internals.exchangeTime(Date.UTC(2024, 0, 15, 12), false, -6).minutes).toBe(6 * 60)
  })

  it('agrupa la semana por domingo', () => {
    const sunday = internals.exchangeTime(Date.UTC(2024, 0, 7, 18), true, -5)
    const wednesday = internals.exchangeTime(Date.UTC(2024, 0, 10, 18), true, -5)
    const nextSunday = internals.exchangeTime(Date.UTC(2024, 0, 14, 18), true, -5)
    expect(sunday.weekKey).toBe(wednesday.weekKey)
    expect(nextSunday.weekKey).not.toBe(wednesday.weekKey)
  })
})

describe('ventanas de sesion', () => {
  it('resuelve una ventana normal', () => {
    expect(internals.inWindow(570, 570, 1020)).toBe(true) // 09:30 incluido
    expect(internals.inWindow(1019, 570, 1020)).toBe(true)
    expect(internals.inWindow(1020, 570, 1020)).toBe(false) // 17:00 excluido
    expect(internals.inWindow(569, 570, 1020)).toBe(false)
  })

  it('resuelve una ventana que cruza medianoche', () => {
    expect(internals.inWindow(1020, 1020, 570)).toBe(true)
    expect(internals.inWindow(23 * 60, 1020, 570)).toBe(true)
    expect(internals.inWindow(0, 1020, 570)).toBe(true)
    expect(internals.inWindow(569, 1020, 570)).toBe(true)
    expect(internals.inWindow(570, 1020, 570)).toBe(false)
    expect(internals.inWindow(1019, 1020, 570)).toBe(false)
  })

  it('RTH y overnight son complementarias con los valores por defecto', () => {
    for (let m = 0; m < 1440; m += 1) {
      const rth = internals.inWindow(m, 570, 1020)
      const ovn = internals.inWindow(m, 1020, 570)
      expect(rth === ovn).toBe(false)
    }
  })
})

describe('perfil de volumen', () => {
  it('devuelve null sin datos utilizables', () => {
    expect(internals.buildProfile([], 1, 2, 10, 68)).toBeNull()
    expect(internals.buildProfile([{ h: 2, l: 1, v: 10, dir: 1 }], 2, 2, 10, 68)).toBeNull()
    expect(internals.buildProfile([{ h: 2, l: 1, v: 0, dir: 1 }], 1, 2, 10, 68)).toBeNull()
  })

  it('reparte el volumen proporcionalmente al solapamiento de cada fila', () => {
    // Una vela que cubre todo el rango: el volumen se reparte por igual.
    const profile = internals.buildProfile([{ h: 10, l: 0, v: 100, dir: 1 }], 0, 10, 10, 68)
    for (let r = 0; r < 10; r += 1) {
      expect(profile.vol[r]).toBeCloseTo(10, 6)
    }
    expect(profile.total).toBeCloseTo(100, 6)
  })

  it('concentra el POC donde se acumula el volumen', () => {
    const bars = [
      { h: 10, l: 0, v: 100, dir: 1 },
      { h: 5.5, l: 5.0, v: 900, dir: 1 },
    ]
    const profile = internals.buildProfile(bars, 0, 10, 10, 68)
    // Fila 5 = [5, 6): recibe las 900 unidades concentradas.
    expect(profile.pocRow).toBe(5)
    expect(profile.poc).toBeCloseTo(5.5, 6)
    expect(profile.vol[5]).toBeGreaterThan(profile.vol[4])
  })

  it('el value area cubre al menos el porcentaje pedido y contiene al POC', () => {
    const random = makeRandom(7)
    const bars = []
    for (let i = 0; i < 500; i += 1) {
      const mid = 50 + (random() - 0.5) * 20
      bars.push({ h: mid + 0.5, l: mid - 0.5, v: 10 + random() * 100, dir: random() > 0.5 ? 1 : -1 })
    }
    const profile = internals.buildProfile(bars, 30, 70, 60, 68)
    let inside = 0
    for (let r = profile.valRow; r <= profile.vahRow; r += 1) {
      inside += profile.vol[r]
    }
    expect(inside / profile.total).toBeGreaterThanOrEqual(0.68)
    expect(profile.valRow).toBeLessThanOrEqual(profile.pocRow)
    expect(profile.vahRow).toBeGreaterThanOrEqual(profile.pocRow)
    expect(profile.val).toBeLessThanOrEqual(profile.poc)
    expect(profile.vah).toBeGreaterThanOrEqual(profile.poc)
    expect(profile.val).toBeGreaterThanOrEqual(profile.low)
    expect(profile.vah).toBeLessThanOrEqual(profile.high)
  })

  it('separa volumen up y down y calcula el delta', () => {
    const bars = [
      { h: 1, l: 1, v: 300, dir: 1 },
      { h: 1, l: 1, v: 100, dir: -1 },
    ]
    const profile = internals.buildProfile(bars, 0, 2, 4, 68)
    expect(profile.upTotal).toBeCloseTo(300, 6)
    expect(profile.downTotal).toBeCloseTo(100, 6)
    expect(profile.delta).toBeCloseTo(200, 6)
  })

  it('respeta el numero de filas configurado', () => {
    const profile = internals.buildProfile([{ h: 10, l: 0, v: 100, dir: 1 }], 0, 10, 25, 68)
    expect(profile.vol.length).toBe(25)
    expect(profile.rowSize).toBeCloseTo(0.4, 10)
  })
})

describe('VWAP', () => {
  it('calcula media ponderada y desviacion acumuladas', () => {
    const state = internals.newVwapState()
    internals.vwapUpdate(state, 'd1', 100, 10)
    internals.vwapUpdate(state, 'd1', 110, 30)
    const values = internals.vwapValues(state, 1, 2)
    const expected = (100 * 10 + 110 * 30) / 40
    expect(values.value).toBeCloseTo(expected, 10)
    const variance = (10 * 100 * 100 + 30 * 110 * 110) / 40 - expected * expected
    expect(values.sd).toBeCloseTo(Math.sqrt(variance), 10)
    expect(values.upper1).toBeCloseTo(expected + values.sd, 10)
    expect(values.lower2).toBeCloseTo(expected - 2 * values.sd, 10)
  })

  it('reinicia los acumuladores al cambiar de ancla', () => {
    const state = internals.newVwapState()
    internals.vwapUpdate(state, 'd1', 100, 10)
    internals.vwapUpdate(state, 'd2', 200, 5)
    expect(internals.vwapValues(state, 1, 2).value).toBeCloseTo(200, 10)
  })

  it('devuelve null sin volumen', () => {
    expect(internals.vwapValues(internals.newVwapState(), 1, 2)).toBeNull()
  })
})

describe('lectura de velas', () => {
  it('acepta metodos y valores planos', () => {
    const ms = Date.UTC(2024, 0, 8, 15, 0)
    const fromMethods = internals.readBar(makeBar(7, ms, 1, 2, 0.5, 1.5, 100), 0)
    expect(fromMethods).toMatchObject({ x: 7, ms, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 })

    const fromPlain = internals.readBar(
      { index: 3, timestamp: ms, open: 1, high: 2, low: 0, close: 1, volume: 5 },
      0
    )
    expect(fromPlain).toMatchObject({ x: 3, ms, high: 2, volume: 5 })
  })
})

describe('integracion sobre velas de 1 minuto', () => {
  // Lunes 8 de enero de 2024, 00:00 NY = 05:00 UTC. Cuatro dias continuos.
  const START = Date.UTC(2024, 0, 8, 5, 0)
  const MINUTES = 4 * 24 * 60
  let bars
  let instance

  beforeAll(() => {
    bars = generateBars({ startMs: START, minutes: MINUTES })
    instance = makeCalculator(indicator)
    runAll(instance, bars)
  })

  it('cierra una sesion RTH por dia', () => {
    // Cuatro dias continuos -> cuatro cierres de RTH (17:00 NY de cada dia).
    expect(instance.completedRth.length).toBe(4)
    expect(instance.completedOvn.length).toBeGreaterThanOrEqual(3)
  })

  it('cada perfil completado tiene POC dentro de su rango', () => {
    for (const record of instance.completedRth) {
      const p = record.profile
      expect(p.poc).toBeGreaterThanOrEqual(p.low)
      expect(p.poc).toBeLessThanOrEqual(p.high)
      expect(record.endX).toBeGreaterThan(record.startX)
    }
  })

  it('los extremos de la sesion RTH coinciden con los datos crudos', () => {
    const record = instance.completedRth[0]
    let high = -Infinity
    let low = Infinity
    for (let i = record.startX; i <= record.endX; i += 1) {
      const minutes = nyMinutes(START + i * MINUTE, internals)
      if (minutes >= 570 && minutes < 1020) {
        high = Math.max(high, bars[i].high())
        low = Math.min(low, bars[i].low())
      }
    }
    expect(record.profile.high).toBeCloseTo(high, 10)
    expect(record.profile.low).toBeCloseTo(low, 10)
  })

  it('la sesion RTH empieza a las 09:30 y termina a las 16:59 NY', () => {
    const record = instance.completedRth[0]
    expect(nyMinutes(START + record.startX * MINUTE, internals)).toBe(570)
    expect(nyMinutes(START + record.endX * MINUTE, internals)).toBe(1019)
  })

  it('mantiene como maximo maxSessions perfiles por sesion', () => {
    const limited = makeCalculator(indicator, { maxSessions: 2 })
    runAll(limited, bars)
    expect(limited.completedRth.length).toBeLessThanOrEqual(2)
    expect(limited.completedOvn.length).toBeLessThanOrEqual(2)
  })

  it('calcula el Initial Balance con los primeros 60 minutos de RTH', () => {
    const partial = makeCalculator(indicator)
    // Segunda sesion RTH: exactamente 1440 velas de 1 minuto despues de la primera.
    const rthStartIndex = instance.completedRth[0].startX + 24 * 60
    const upTo = rthStartIndex + 120
    for (let i = 0; i <= upTo && i < bars.length; i += 1) {
      partial.map(bars[i], i)
    }
    let high = -Infinity
    let low = Infinity
    for (let i = rthStartIndex; i < rthStartIndex + 60; i += 1) {
      high = Math.max(high, bars[i].high())
      low = Math.min(low, bars[i].low())
    }
    expect(partial.kl.ibHigh).toBeCloseTo(high, 10)
    expect(partial.kl.ibLow).toBeCloseTo(low, 10)
    expect(partial.inIb).toBe(false) // ya paso el IB en el minuto 120
  })

  it('propaga el RTH previo y el YPOC del ultimo perfil cerrado', () => {
    expect(instance.kl.prevRthHigh).not.toBeNull()
    expect(instance.kl.prevRthLow).not.toBeNull()
    expect(instance.prevProfile.poc).not.toBeNull()
    const last = instance.completedRth[instance.completedRth.length - 1]
    expect(instance.prevProfile.poc).toBeCloseTo(last.profile.poc, 10)
    expect(instance.historicPocs.length).toBe(instance.completedRth.length)
  })

  it('registra el overnight activo y su rango', () => {
    expect(instance.kl.lastOvnHigh).not.toBeNull()
    expect(instance.kl.lastOvnLow).not.toBeNull()
    expect(instance.kl.lastOvnHigh).toBeGreaterThan(instance.kl.lastOvnLow)
  })

  it('acumula la serie VWAP y la reancla cada dia de negociacion', () => {
    expect(instance.series.length).toBe(MINUTES)
    const withVwap = instance.series.filter((point) => point.vwap !== null)
    expect(withVwap.length).toBe(MINUTES)
    for (const point of withVwap) {
      expect(point.u1).toBeGreaterThanOrEqual(point.vwap)
      expect(point.l1).toBeLessThanOrEqual(point.vwap)
      expect(point.u2).toBeGreaterThanOrEqual(point.u1)
      expect(point.l2).toBeLessThanOrEqual(point.l1)
    }
  })

  it('el rango reciente solo mira la ventana pedida', () => {
    const local = makeCalculator(indicator)
    const start = Date.UTC(2024, 0, 8, 5, 0)
    // Pico antiguo muy alto seguido de 300 velas en rango estrecho.
    local.map(makeBar(0, start, 100, 999, 100, 100, 10), 0)
    for (let i = 1; i <= 300; i += 1) {
      local.map(makeBar(i, start + i * MINUTE, 100, 101, 99, 100, 10), i)
    }
    const recent = local.recentRange(200)
    expect(recent.high).toBeCloseTo(101, 10)
    expect(recent.low).toBeCloseTo(99, 10)
    expect(local.recentRange(500).high).toBeCloseTo(999, 10)
  })

  it('el gap se mide contra el cierre RTH previo', () => {
    const gap = instance.gapInfo()
    if (instance.kl.todayOpen !== null && instance.kl.prevRthClose !== null) {
      expect(gap.size).toBeCloseTo(instance.kl.todayOpen - instance.kl.prevRthClose, 10)
    }
  })
})

describe('recalculo de la vela en formacion', () => {
  it('es idempotente: repetir map() sobre la ultima vela no duplica estado', () => {
    const bars = generateBars({ startMs: Date.UTC(2024, 0, 8, 5, 0), minutes: 3 * 24 * 60 })
    const a = makeCalculator(indicator)
    runAll(a, bars)
    const snapshot = JSON.stringify({
      kl: a.kl,
      rthCount: a.completedRth.length,
      ovnCount: a.completedOvn.length,
      pocs: a.historicPocs,
      barsInRth: a.rth.bars.length,
      barsInOvn: a.ovn.bars.length,
      series: a.series.length,
      vwap: a.vwapState,
      week: a.week,
    })

    const lastIndex = bars.length - 1
    for (let t = 0; t < 5; t += 1) {
      a.map(bars[lastIndex], lastIndex)
    }

    expect(
      JSON.stringify({
        kl: a.kl,
        rthCount: a.completedRth.length,
        ovnCount: a.completedOvn.length,
        pocs: a.historicPocs,
        barsInRth: a.rth.bars.length,
        barsInOvn: a.ovn.bars.length,
        series: a.series.length,
        vwap: a.vwapState,
        week: a.week,
      })
    ).toBe(snapshot)
  })

  it('produce el mismo resultado que un recorrido limpio cuando se repiten ticks', () => {
    const bars = generateBars({ startMs: Date.UTC(2024, 0, 8, 5, 0), minutes: 2 * 24 * 60 })
    const clean = makeCalculator(indicator)
    runAll(clean, bars)

    const ticked = makeCalculator(indicator)
    for (let i = 0; i < bars.length; i += 1) {
      ticked.map(bars[i], i)
      ticked.map(bars[i], i) // segundo tick sobre la misma vela
    }

    expect(JSON.stringify(ticked.kl)).toBe(JSON.stringify(clean.kl))
    expect(ticked.completedRth.length).toBe(clean.completedRth.length)
    expect(ticked.series.length).toBe(clean.series.length)
    expect(ticked.historicPocs).toEqual(clean.historicPocs)
  })

  it('el cierre de sesion tambien se rebobina', () => {
    const bars = generateBars({ startMs: Date.UTC(2024, 0, 8, 5, 0), minutes: 24 * 60 })
    const instance = makeCalculator(indicator)
    // Indice de la primera vela fuera de RTH (17:00 NY = minuto 1020 del dia).
    const closingIndex = 1020
    for (let i = 0; i < closingIndex; i += 1) {
      instance.map(bars[i], i)
    }
    expect(instance.completedRth.length).toBe(0)

    instance.map(bars[closingIndex], closingIndex)
    expect(instance.completedRth.length).toBe(1)
    const pocAfterFirstTick = instance.completedRth[0].profile.poc

    instance.map(bars[closingIndex], closingIndex)
    instance.map(bars[closingIndex], closingIndex)
    expect(instance.completedRth.length).toBe(1)
    expect(instance.completedRth[0].profile.poc).toBeCloseTo(pocAfterFirstTick, 10)
  })
})

describe('probabilidades', () => {
  function feed(instance, startMs, count, priceFn, startIndex = 0) {
    for (let i = 0; i < count; i += 1) {
      const ms = startMs + i * MINUTE
      const { open, high, low, close } = priceFn(i)
      instance.map(makeBar(startIndex + i, ms, open, high, low, close, 100), startIndex + i)
    }
    return startIndex + count
  }

  it('degrada la probabilidad opuesta al tocar los extremos overnight y del RTH previo', () => {
    const instance = makeCalculator(indicator)
    const start = Date.UTC(2024, 0, 8, 5, 0) // 00:00 NY

    // Dia 1 completo en rango estrecho: crea RTH y overnight de referencia.
    let index = feed(instance, start, 24 * 60, () => ({ open: 100, high: 101, low: 99, close: 100 }))

    // Dia 2: overnight plano y RTH que rompe por arriba.
    const day2 = start + 24 * 60 * MINUTE
    index = feed(instance, day2, 570, () => ({ open: 100, high: 100.5, low: 99.5, close: 100 }), index)

    expect(instance.kl.probOnHigh).toBe(97)
    expect(instance.kl.probOnLow).toBe(97)

    feed(
      instance,
      day2 + 570 * MINUTE,
      120,
      () => ({ open: 100, high: 120, low: 99.8, close: 119 }),
      index
    )

    expect(instance.kl.touchedOnHigh).toBe(true)
    expect(instance.kl.probOnLow).toBe(28)
    expect(instance.kl.probOnHigh).toBe(97)
    expect(instance.kl.touchedPdh).toBe(true)
    expect(instance.kl.probPdl).toBe(11)
  })

  it('aplica la probabilidad del IB solo despues de cerrar el IB', () => {
    const instance = makeCalculator(indicator)
    const start = Date.UTC(2024, 0, 8, 5, 0)
    let index = feed(instance, start, 24 * 60, () => ({ open: 100, high: 101, low: 99, close: 100 }))
    const day2 = start + 24 * 60 * MINUTE
    index = feed(instance, day2, 570, () => ({ open: 100, high: 100.2, low: 99.8, close: 100 }), index)

    // IB (60 min) en rango 99-101.
    index = feed(
      instance,
      day2 + 570 * MINUTE,
      60,
      () => ({ open: 100, high: 101, low: 99, close: 100 }),
      index
    )
    expect(instance.kl.probIbHigh).toBe(96)
    expect(instance.kl.probIbLow).toBe(96)
    expect(instance.kl.ibHigh).toBeCloseTo(101, 10)

    // Tras el IB, se rompe el maximo: la probabilidad del minimo cae a 21%.
    feed(
      instance,
      day2 + 630 * MINUTE,
      30,
      () => ({ open: 100.5, high: 102, low: 100.4, close: 101.8 }),
      index
    )
    expect(instance.kl.ibHighTouchedFirst).toBe(true)
    expect(instance.kl.probIbLow).toBe(21)
    expect(instance.kl.probIbHigh).toBe(96)
  })
})

describe('niveles semanales', () => {
  it('acumula la semana en curso y expone las dos anteriores', () => {
    const instance = makeCalculator(indicator)
    // Semanas completas de velas horarias desde el domingo 7 de enero de 2024,
    // de modo que cada bloque coincide con una semana natural (domingo a sabado).
    const start = Date.UTC(2024, 0, 7, 5, 0)
    let index = 0
    const emit = (hourOffset, base) => {
      const ms = start + hourOffset * 60 * MINUTE
      instance.map(makeBar(index, ms, base, base + 5, base - 5, base, 100), index)
      index += 1
    }
    for (let week = 0; week < 3; week += 1) {
      for (let hour = 0; hour < 24 * 7; hour += 1) {
        emit(week * 24 * 7 + hour, 100 + week * 10)
      }
    }
    // Una vela de la cuarta semana para que la tercera quede cerrada.
    emit(3 * 24 * 7, 130)

    const weekly = instance.prevWeekLevels()
    expect(weekly.high).toBeCloseTo(125, 10) // 3a semana (base 120)
    expect(weekly.low).toBeCloseTo(115, 10)
    expect(weekly.high2).toBeCloseTo(115, 10) // 2a semana (base 110)
    expect(weekly.low2).toBeCloseTo(105, 10)

    // El ancla de las lineas semanales avanza con cada semana nueva.
    expect(instance.week.startX).toBe(3 * 24 * 7)
  })
})

describe('plotter', () => {
  function makeCanvasSpy(capabilities = ['drawLine', 'drawRectangle', 'drawText']) {
    const calls = { drawLine: [], drawRectangle: [], drawText: [], drawPolygon: [] }
    const canvas = {}
    for (const name of capabilities) {
      canvas[name] = (...args) => calls[name].push(args)
    }
    return { canvas, calls }
  }

  it('dibuja perfiles, niveles, VWAP y dashboard sin lanzar', () => {
    const bars = generateBars({ startMs: Date.UTC(2024, 0, 8, 5, 0), minutes: 2 * 24 * 60 })
    const instance = makeCalculator(indicator)
    runAll(instance, bars)

    const { canvas, calls } = makeCanvasSpy()
    expect(() => indicator.plotter.fn(canvas, instance, null)).not.toThrow()

    expect(calls.drawRectangle.length).toBeGreaterThan(0) // histograma
    expect(calls.drawLine.length).toBeGreaterThan(0) // POC/VAH/VAL + niveles + VWAP
    expect(calls.drawText.length).toBeGreaterThan(0) // etiquetas + dashboard
    expect(instance.drawErrors).toEqual([])

    for (const [from, to, style] of calls.drawLine) {
      expect(Number.isFinite(from.x)).toBe(true)
      expect(Number.isFinite(from.y)).toBe(true)
      expect(Number.isFinite(to.x)).toBe(true)
      expect(Number.isFinite(to.y)).toBe(true)
      expect(style.relativeX).toBe(false)
      expect(style.relativeY).toBe(false)
    }
  })

  it('degrada a poligono cuando no existe drawRectangle', () => {
    const bars = generateBars({ startMs: Date.UTC(2024, 0, 8, 5, 0), minutes: 24 * 60 })
    const instance = makeCalculator(indicator)
    runAll(instance, bars)

    const { canvas, calls } = makeCanvasSpy(['drawLine', 'drawPolygon', 'drawText'])
    indicator.plotter.fn(canvas, instance, null)
    expect(calls.drawPolygon.length).toBeGreaterThan(0)
    for (const [points] of calls.drawPolygon) {
      expect(points.length).toBe(4)
    }
  })

  it('no lanza cuando el canvas solo soporta lineas', () => {
    const bars = generateBars({ startMs: Date.UTC(2024, 0, 8, 5, 0), minutes: 24 * 60 })
    const instance = makeCalculator(indicator)
    runAll(instance, bars)

    const { canvas, calls } = makeCanvasSpy(['drawLine'])
    expect(() => indicator.plotter.fn(canvas, instance, null)).not.toThrow()
    expect(calls.drawLine.length).toBeGreaterThan(0)
  })

  it('captura errores del canvas en lugar de romper el render', () => {
    const bars = generateBars({ startMs: Date.UTC(2024, 0, 8, 5, 0), minutes: 24 * 60 })
    const instance = makeCalculator(indicator)
    runAll(instance, bars)

    const canvas = {
      drawLine: () => {
        throw new Error('no soportado')
      },
      drawRectangle: () => {},
      drawText: () => {},
    }
    expect(() => indicator.plotter.fn(canvas, instance, null)).not.toThrow()
    expect(instance.drawErrors.length).toBeGreaterThan(0)
    expect(instance.drawErrors.length).toBeLessThanOrEqual(5)
  })

  it('no dibuja nada antes de la primera vela', () => {
    const instance = makeCalculator(indicator)
    const { canvas, calls } = makeCanvasSpy()
    indicator.plotter.fn(canvas, instance, null)
    expect(calls.drawLine.length).toBe(0)
    expect(calls.drawRectangle.length).toBe(0)
  })

  it('respeta las opciones de visualizacion', () => {
    const bars = generateBars({ startMs: Date.UTC(2024, 0, 8, 5, 0), minutes: 24 * 60 })
    const instance = makeCalculator(indicator, {
      showHistogram: false,
      showVwap: false,
      showDashboard: false,
      showKeyLevelLabels: false,
      showProfileLabels: false,
      showProfileStats: false,
    })
    runAll(instance, bars)

    const { canvas, calls } = makeCanvasSpy()
    indicator.plotter.fn(canvas, instance, null)
    expect(calls.drawRectangle.length).toBe(0)
    expect(calls.drawText.length).toBe(0)
    expect(calls.drawLine.length).toBeGreaterThan(0) // POC/VAH/VAL y niveles clave
  })

  it('extendRight prolonga POC/VAH/VAL hasta el borde derecho', () => {
    const bars = generateBars({ startMs: Date.UTC(2024, 0, 8, 5, 0), minutes: 2 * 24 * 60 })
    const options = { showHistogram: false, showVwap: false, showDashboard: false }

    const plain = makeCalculator(indicator, options)
    runAll(plain, bars)
    const plainSpy = makeCanvasSpy()
    indicator.plotter.fn(plainSpy.canvas, plain, null)

    const extended = makeCalculator(indicator, { ...options, extendRight: true })
    runAll(extended, bars)
    const extendedSpy = makeCanvasSpy()
    indicator.plotter.fn(extendedSpy.canvas, extended, null)

    const record = plain.completedRth[0]
    const pocLine = ([from]) => Math.abs(from.y - record.profile.poc) < 1e-9 && from.x === record.startX
    const plainPoc = plainSpy.calls.drawLine.find(pocLine)
    const extendedPoc = extendedSpy.calls.drawLine.find(pocLine)

    expect(plainPoc[1].x).toBe(record.endX)
    expect(extendedPoc[1].x).toBe(extended.lastBarIndex + extended.props.labelOffset)
  })

  it('coloca el perfil a la izquierda o a la derecha segun el parametro', () => {
    const bars = generateBars({ startMs: Date.UTC(2024, 0, 8, 5, 0), minutes: 24 * 60 })

    const left = makeCalculator(indicator, { profileSide: 'left', showVwap: false })
    runAll(left, bars)
    const leftSpy = makeCanvasSpy()
    indicator.plotter.fn(leftSpy.canvas, left, null)

    const right = makeCalculator(indicator, { profileSide: 'right', showVwap: false })
    runAll(right, bars)
    const rightSpy = makeCanvasSpy()
    indicator.plotter.fn(rightSpy.canvas, right, null)

    const record = left.completedRth[0]
    const leftBoxes = leftSpy.calls.drawRectangle.filter(([a]) => a.x >= record.startX && a.x <= record.endX)
    const rightBoxes = rightSpy.calls.drawRectangle.filter(([a]) => a.x >= record.startX && a.x <= record.endX)
    const minLeft = Math.min(...leftBoxes.map(([a]) => a.x))
    const maxRight = Math.max(...rightBoxes.map(([, b]) => b.x))
    expect(minLeft).toBe(record.startX)
    expect(maxRight).toBe(record.endX)
  })
})

describe('formato', () => {
  it('abrevia volumenes', () => {
    expect(internals.formatVolume(950)).toBe('950')
    expect(internals.formatVolume(1500)).toBe('1.5K')
    expect(internals.formatVolume(2500000)).toBe('2.50M')
    expect(internals.formatVolume(null)).toBe('n/a')
  })

  it('convierte a ticks', () => {
    expect(internals.formatTicks(2.5, 0.25)).toBe('10')
    expect(internals.formatTicks(-1, 0.25)).toBe('-4')
    expect(internals.formatTicks(null, 0.25)).toBe('n/a')
  })

  it('formatea precios con los decimales configurados', () => {
    expect(internals.formatPrice(5000.125, 2)).toBe('5000.13')
    expect(internals.formatPrice(null, 2)).toBe('n/a')
  })
})
