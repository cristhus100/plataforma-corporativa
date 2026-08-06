import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const INDICATOR_FILE = path.resolve(HERE, '../dualSvpKeyLevels.js')

// --- Stubs del entorno de Tradovate -----------------------------------------

// Reproducen tools/predef.js, tools/meta.js y tools/graphics.js de Tradovate.
const predefStub = {
  paramSpecs: {
    bool: (def) => ({ type: 'boolean', def }),
    number: (def, step, min) => ({ type: 'number', def, restrictions: { step, min } }),
    text: (def) => ({ type: 'text', def }),
    enum: (enumSet, def) => ({ type: 'enum', enumSet, def }),
    period: (def) => ({ type: 'number', def, restrictions: { step: 1, min: 1 } }),
  },
  plotters: {
    custom: (fn) => ({ type: 'custom', function: fn }),
    multiline: (fields) => ({ type: 'multiline', fields }),
  },
  scalers: {
    multiPath: (fields) => ({ type: 'multiPath', fields }),
  },
  styles: { plot: (o) => o },
}

const metaStub = {
  InputType: { BARS: 'bars', VOLUME: 'volume', OHLC: 'ohlc', ANY: 'any' },
  AreaChoice: { OVERLAY: 'overlay', NEW: 'new' },
  ParamType: { NUMBER: 'number', BOOLEAN: 'boolean', TEXT: 'text', ENUM: 'enum' },
}

// du/px/op devuelven objetos etiquetados para poder inspeccionarlos en los tests.
const graphicsStub = {
  du: (value) => ({ du: value }),
  px: (value) => ({ px: value }),
  op: (a, operator, b) => ({ op: [a, operator, b] }),
}

function loadIndicator(modules = {}) {
  const source = fs.readFileSync(INDICATOR_FILE, 'utf8')
  const table = {
    './tools/predef': predefStub,
    './tools/meta': metaStub,
    './tools/graphics': graphicsStub,
    ...modules,
  }
  const requireStub = (id) => {
    if (id in table) return table[id]
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

function makeCalculator(indicator, overrides = {}, environment = {}) {
  const Calculator = indicator.calculator
  const instance = new Calculator()
  instance.props = { ...defaultProps(indicator.params), ...overrides }
  // La app asigna estas propiedades antes de llamar a init().
  instance.contractInfo = { contract: 'MESU6', product: 'MES', tickSize: 0.25, ...environment.contractInfo }
  instance.chartDescription = {
    underlyingType: 'MinuteBar',
    elementSize: 1,
    elementSizeUnit: 'UnderlyingUnits',
    withHistogram: false,
    ...environment.chartDescription,
  }
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

function makeBar(index, ms, open, high, low, close, volume, extra = {}) {
  const bar = {
    index: () => index,
    timestamp: () => new Date(ms),
    open: () => open,
    high: () => high,
    low: () => low,
    close: () => close,
    volume: () => volume,
    value: () => close,
    isLast: () => extra.isLast === true,
  }
  if (extra.offerVolume !== undefined) bar.offerVolume = () => extra.offerVolume
  if (extra.bidVolume !== undefined) bar.bidVolume = () => extra.bidVolume
  if (extra.levels !== undefined) bar.profile = () => extra.levels
  return bar
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
    expect(indicator.areaChoice).toBe('overlay')
    expect(indicator.requirements.volumeProfiles).toBe(true)
    expect(Object.keys(indicator.params).length).toBeGreaterThan(40)
  })

  it('dibuja el VWAP como plot nativo con estilos declarados', () => {
    expect(indicator.plotter.type).toBe('multiline')
    for (const field of indicator.plotter.fields) {
      expect(Object.keys(indicator.plots), `plot ${field}`).toContain(field)
      expect(indicator.schemeStyles.dark[field], `estilo ${field}`).toBeDefined()
    }
    for (const style of Object.values(indicator.schemeStyles.dark)) {
      expect(typeof style.color).toBe('string')
      expect(typeof style.lineWidth).toBe('number')
    }
  })

  it('se registra en las categorias del menu de indicadores', () => {
    expect(indicator.description).toBe('Dual SVP HD + Key Levels Pro')
    expect(indicator.tags).toContain('Key Levels')
    expect(indicator.tags).toContain('Volume Profile')
    expect(indicator.tags).toContain('Volume-based')
  })

  it('no expone campos ajenos a la interfaz Indicator', () => {
    const known = new Set([
      'name',
      'calculator',
      'description',
      'params',
      'inputType',
      'areaChoice',
      'plots',
      'plotter',
      'tags',
      'schemeStyles',
      'scaler',
      'dlls',
      'requirements',
      'shifts',
    ])
    for (const key of Object.keys(indicator)) {
      expect(known, `campo exportado ${key}`).toContain(key)
    }
    // _internals sigue siendo accesible para los tests, pero no es enumerable.
    expect(Object.keys(indicator)).not.toContain('_internals')
    expect(indicator._internals).toBeDefined()
  })

  it('carga aunque la build de predef no traiga las funciones mas nuevas', () => {
    // Sin paramSpecs.text, sin plotters.multiline, sin scalers y sin tags.
    const minimalPredef = {
      paramSpecs: {
        bool: predefStub.paramSpecs.bool,
        number: predefStub.paramSpecs.number,
        enum: predefStub.paramSpecs.enum,
      },
      plotters: {},
    }
    let degraded
    expect(() => {
      degraded = loadIndicator({ './tools/predef': minimalPredef, './tools/meta': {} })
    }).not.toThrow()

    expect(degraded.inputType).toBe('bars')
    expect(degraded.areaChoice).toBe('overlay')
    expect(degraded.tags).toContain('Volume-based')
    expect(degraded.plotter).toEqual({ type: 'multiline', fields: expect.any(Array) })
    expect(degraded.scaler).toEqual({ type: 'multiPath', fields: ['vwap'] })
    expect(degraded.params.rthPocColor).toEqual({ type: 'text', def: '#FF6B6B' })
    for (const [key, spec] of Object.entries(degraded.params)) {
      expect(spec.def, `parametro ${key}`).toBeDefined()
    }
  })

  it('solo usa tipos de parametro soportados por la app', () => {
    const allowed = new Set(['number', 'boolean', 'text', 'enum'])
    for (const [key, spec] of Object.entries(indicator.params)) {
      expect(spec.def, `parametro ${key}`).toBeDefined()
      expect(allowed, `tipo de ${key}`).toContain(spec.type)
      if (spec.type === 'enum') {
        expect(Object.keys(spec.enumSet), `enumSet de ${key}`).toContain(spec.def)
      }
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

  it('descarta la primera semana si el historial empieza a mitad de semana', () => {
    // El historial del grafico casi nunca empieza en lunes: esa primera semana
    // es un fragmento y no puede contar como semana completa.
    const instance = makeCalculator(indicator)
    // Miercoles 10 de enero de 2024, 00:00 NY.
    const start = Date.UTC(2024, 0, 10, 5, 0)
    let index = 0
    const emit = (hourOffset, base) => {
      const ms = start + hourOffset * 60 * MINUTE
      instance.map(makeBar(index, ms, base, base + 5, base - 5, base, 100), index)
      index += 1
    }

    // Fragmento miercoles-sabado (base 100), luego dos semanas completas.
    for (let hour = 0; hour < 24 * 4; hour += 1) emit(hour, 100)
    for (let hour = 0; hour < 24 * 7; hour += 1) emit(24 * 4 + hour, 110)
    for (let hour = 0; hour < 24 * 7; hour += 1) emit(24 * 11 + hour, 120)
    emit(24 * 18, 130) // una vela de la semana siguiente para cerrar la ultima

    const weekly = instance.prevWeekLevels()
    // El fragmento (95..105) no aparece por ningun lado.
    expect(weekly.high).toBeCloseTo(125, 10)
    expect(weekly.low).toBeCloseTo(115, 10)
    expect(weekly.high2).toBeCloseTo(115, 10)
    expect(weekly.low2).toBeCloseTo(105, 10)
    expect(instance.week.closed).toHaveLength(2)
  })

  it('no dibuja P2W si no hay suficientes semanas completas', () => {
    const instance = makeCalculator(indicator)
    const start = Date.UTC(2024, 0, 7, 5, 0) // domingo
    let index = 0
    for (let hour = 0; hour < 24 * 8; hour += 1) {
      const ms = start + hour * 60 * MINUTE
      instance.map(makeBar(index, ms, 100, 105, 95, 100, 100), index)
      index += 1
    }
    const weekly = instance.prevWeekLevels()
    expect(weekly.high).toBeCloseTo(105, 10)
    expect(weekly.high2).toBeNull()
    expect(weekly.low2).toBeNull()

    // Y sin valor, la linea y su etiqueta no se emiten.
    const last = makeBar(index, start + 24 * 8 * 60 * MINUTE, 100, 105, 95, 100, 100, {
      isLast: true,
    })
    const items = instance.map(last, index).graphics.items
    const keys = items.map((item) => item.key)
    expect(keys).toContain('kl-pwh')
    expect(keys).not.toContain('kl-p2wh')
    expect(keys).not.toContain('kl-p2wh-t')
  })
})

describe('perfil de volumen real (d.profile)', () => {
  it('acumula precio a precio y separa ask/bid cuando la vela trae su perfil', () => {
    const bars = [
      {
        h: 10,
        l: 0,
        v: 1000,
        dir: 1,
        levels: [
          { price: 5.5, vol: 900, askVol: 600, bidVol: 300 },
          { price: 1.5, vol: 100, askVol: 40, bidVol: 60 },
        ],
      },
    ]
    const profile = internals.buildProfile(bars, 0, 10, 10, 68)
    expect(profile.vol[5]).toBeCloseTo(900, 10)
    expect(profile.vol[1]).toBeCloseTo(100, 10)
    expect(profile.up[5]).toBeCloseTo(600, 10)
    expect(profile.down[5]).toBeCloseTo(300, 10)
    expect(profile.pocRow).toBe(5)
    expect(profile.delta).toBeCloseTo(640 - 360, 10)
    // Sin reparto proporcional: las filas no tocadas quedan vacias.
    expect(profile.vol[0]).toBe(0)
    expect(profile.vol[9]).toBe(0)
  })

  it('usa offerVolume/bidVolume para el reparto up/down si no hay perfil', () => {
    expect(internals.upShareOf({ dir: 1 })).toBe(1)
    expect(internals.upShareOf({ dir: -1 })).toBe(0)
    expect(internals.upShareOf({ dir: -1, up: 75, down: 25 })).toBeCloseTo(0.75, 10)
    expect(internals.upShareOf({ dir: 1, up: 0, down: 0 })).toBe(1)

    const profile = internals.buildProfile(
      [{ h: 1, l: 1, v: 100, dir: -1, up: 80, down: 20 }],
      0,
      2,
      4,
      68
    )
    expect(profile.upTotal).toBeCloseTo(80, 10)
    expect(profile.downTotal).toBeCloseTo(20, 10)
  })

  it('el calculador propaga el perfil y los volumenes reales de cada vela', () => {
    const instance = makeCalculator(indicator, {}, { chartDescription: { withHistogram: true } })
    expect(instance.hasVolumeProfiles).toBe(true)

    const start = Date.UTC(2024, 0, 8, 14, 30) // 09:30 NY
    instance.map(
      makeBar(0, start, 100, 101, 99, 100.5, 500, {
        offerVolume: 300,
        bidVolume: 200,
        levels: [{ price: 100, vol: 500, askVol: 300, bidVol: 200 }],
      }),
      0
    )
    const stored = instance.rth.bars[0]
    expect(stored.up).toBe(300)
    expect(stored.down).toBe(200)
    expect(stored.levels).toHaveLength(1)
  })

  it('toma el tick size del contrato salvo override explicito', () => {
    expect(makeCalculator(indicator).cfg.tickSize).toBe(0.25)
    expect(makeCalculator(indicator).cfg.decimals).toBe(2)
    expect(
      makeCalculator(indicator, {}, { contractInfo: { tickSize: 0.00005 } }).cfg.decimals
    ).toBe(5)
    expect(makeCalculator(indicator, { tickSizeOverride: 0.1 }).cfg.tickSize).toBe(0.1)
    expect(internals.decimalsForTick(0.25)).toBe(2)
    expect(internals.decimalsForTick(1)).toBe(0)
    expect(internals.decimalsForTick(0.01)).toBe(2)
  })
})

describe('graphics', () => {
  const START = Date.UTC(2024, 0, 8, 5, 0)

  function asLast(bar) {
    return Object.assign({}, bar, { isLast: () => true })
  }

  /** Ejecuta el historial y devuelve el resultado de map() sobre la ultima vela. */
  function runAndDraw(instance, bars) {
    for (let i = 0; i < bars.length - 1; i += 1) {
      instance.map(bars[i], i)
    }
    const lastIndex = bars.length - 1
    return instance.map(asLast(bars[lastIndex]), lastIndex)
  }

  function collect(items, tag, out = []) {
    for (const item of items) {
      if (item.tag === tag) out.push(item)
      if (item.tag === 'Container' && item.children) collect(item.children, tag, out)
    }
    return out
  }

  let bars
  let instance
  let result

  beforeAll(() => {
    bars = generateBars({ startMs: START, minutes: 2 * 24 * 60 })
    instance = makeCalculator(indicator)
    result = runAndDraw(instance, bars)
  })

  it('solo emite graphics en la ultima vela', () => {
    const other = makeCalculator(indicator)
    expect(other.map(bars[10], 10).graphics).toBeUndefined()
    expect(result.graphics).toBeDefined()
    expect(Array.isArray(result.graphics.items)).toBe(true)
    expect(result.graphics.items.length).toBeGreaterThan(0)
  })

  it('usa solo tags validos y claves unicas', () => {
    const validTags = new Set(['Shapes', 'ContourShapes', 'LineSegments', 'Text', 'Container', 'Dots'])
    const keys = new Set()
    for (const item of result.graphics.items) {
      expect(validTags, `tag ${item.tag}`).toContain(item.tag)
      expect(typeof item.key).toBe('string')
      expect(item.key.length).toBeGreaterThan(0)
      expect(keys.has(item.key), `clave duplicada: ${item.key}`).toBe(false)
      keys.add(item.key)
      expect(item.global).toBe(true)
    }
  })

  it('agrupa el histograma en objetos Shapes con rectangulos validos', () => {
    // Las pastillas de los niveles tambien son Shapes: el histograma son los
    // grupos del perfil, con "-s-" en la clave.
    const shapes = collect(result.graphics.items, 'Shapes').filter((item) =>
      item.key.includes('-s-')
    )
    expect(shapes.length).toBeGreaterThan(0)

    let rectangles = 0
    for (const group of shapes) {
      expect(typeof group.fillStyle.color).toBe('string')
      // Escala 0..100: predef usa `opacity || 100`, asi que 1 seria el 1 %.
      expect(group.fillStyle.opacity).toBeGreaterThanOrEqual(1)
      expect(group.fillStyle.opacity).toBeLessThanOrEqual(100)
      for (const primitive of group.primitives) {
        // Polygon y no Rectangle: el renderer ignora `size` en unidades de dominio.
        expect(primitive.tag).toBe('Polygon')
        expect(primitive.points).toHaveLength(4)
        for (const point of primitive.points) {
          // Coordenadas en unidades de dominio: indice de vela y precio.
          expect(Number.isFinite(point.x.du)).toBe(true)
          expect(Number.isFinite(point.y.du)).toBe(true)
        }
        const xs = primitive.points.map((p) => p.x.du)
        const ys = primitive.points.map((p) => p.y.du)
        expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0)
        expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0)
        rectangles += 1
      }
    }
    // Agrupar por color evita emitir un objeto por fila.
    expect(rectangles).toBeGreaterThan(shapes.length)
  })

  it('dibuja POC, VAH/VAL y niveles clave como LineSegments', () => {
    const groups = collect(result.graphics.items, 'LineSegments')
    const keys = groups.map((g) => g.key)
    expect(keys).toContain('r0-l-poc')
    expect(keys).toContain('r0-l-va')
    expect(keys.some((k) => k.startsWith('kl-'))).toBe(true)

    // Las lineas opacas no llevan el campo opacity: enviarlo con valor 1
    // equivaldria al 1 % y no se verian.
    for (const group of groups) {
      expect(group.lineStyle.opacity === undefined || group.lineStyle.opacity > 1).toBe(true)
      expect(typeof group.lineStyle.lineWidth).toBe('number')
    }
    expect(groups.find((g) => g.key === 'kl-onh').lineStyle.opacity).toBeUndefined()

    const poc = groups.find((g) => g.key === 'r0-l-poc')
    expect(poc.lines).toHaveLength(1)
    expect(poc.lines[0].tag).toBe('Line')
    expect(poc.lines[0].a.y.du).toBeCloseTo(instance.completedRth[0].profile.poc, 10)
    expect(poc.lines[0].b.y.du).toBeCloseTo(instance.completedRth[0].profile.poc, 10)
    expect(poc.lineStyle.lineWidth).toBe(instance.props.profileLineWidth + 1)

    // VAH y VAL comparten estilo, asi que van en el mismo grupo.
    const va = groups.find((g) => g.key === 'r0-l-va')
    expect(va.lines).toHaveLength(2)
    expect(va.lineStyle.lineStyle).toBe(3) // punteado
  })

  it('etiqueta los niveles con su probabilidad cuando corresponde', () => {
    const texts = collect(result.graphics.items, 'Text')
    const byKey = Object.fromEntries(texts.map((t) => [t.key, t]))
    expect(byKey['r0-t-poc'].text).toBe('POC')

    const onh = byKey['kl-onh-t']
    expect(onh.text.startsWith('ONH')).toBe(true)
    expect(typeof onh.style.fontSize).toBe('number')
    expect(typeof onh.style.fill).toBe('string')

    // Las probabilidades solo se muestran dentro del RTH.
    const inRth = makeCalculator(indicator)
    const rthBars = generateBars({ startMs: START, minutes: 24 * 60 + 700 })
    const rthResult = runAndDraw(inRth, rthBars)
    expect(inRth.inRth).toBe(true)
    const label = collect(rthResult.graphics.items, 'Text').find((t) => t.key === 'kl-onh-t')
    expect(label.text).toMatch(/^ONH \d+%$/)
  })

  it('ancla el dashboard a una esquina del marco en pixeles', () => {
    const texts = collect(result.graphics.items, 'Text').filter((t) => t.key.startsWith('dash-'))
    expect(texts.length).toBeGreaterThanOrEqual(4)
    for (const item of texts) {
      // "frame" es el unico origen que se ha visto dibujar.
      expect(item.origin).toEqual({ cs: 'frame', h: 'right', v: 'top' })
      expect(Number.isFinite(item.point.x.px)).toBe(true)
      expect(Number.isFinite(item.point.y.px)).toBe(true)
      // Margen suficiente para librar la escala de precios del marco.
      expect(item.point.x.px).toBeGreaterThanOrEqual(60)
      // Esquina derecha: el texto va hacia dentro, es decir a la izquierda.
      expect(item.textAlignment).toBe('leftMiddle')
    }
    expect(texts[0].text.startsWith('Session:')).toBe(true)

    const bottomLeft = makeCalculator(indicator, { dashboardPosition: 'bottomLeft' })
    const blResult = runAndDraw(bottomLeft, bars)
    const blTexts = collect(blResult.graphics.items, 'Text').filter((t) => t.key.startsWith('dash-'))
    expect(blTexts[0].origin).toEqual({ cs: 'frame', h: 'left', v: 'bottom' })
    expect(blTexts[0].textAlignment).toBe('rightMiddle')
  })

  it('separa la etiqueta de su linea en vertical, no en horizontal', () => {
    // Comportamiento del modo "chart", donde la etiqueta va sobre el grafico.
    const onChart = makeCalculator(indicator, { labelPlacement: 'text' })
    const chartItems = runAndDraw(onChart, bars).graphics.items
    const groups = collect(chartItems, 'LineSegments')
    const texts = collect(chartItems, 'Text')
    const line = groups.find((g) => g.key === 'kl-onh')
    const label = texts.find((t) => t.key === 'kl-onh-t')
    const lineEnd = Math.max(line.lines[0].a.x.du, line.lines[0].b.x.du)

    // La etiqueta queda apoyada sobre el final de la linea, no mas alla.
    expect(label.point.x.du).toBe(lineEnd + 1)
    expect(label.textAlignment).toBe('leftMiddle')

    // La separacion es un desplazamiento en pixeles hacia arriba: op(du(y), '-', px(n)).
    const [base, operator, offset] = label.point.y.op
    expect(operator).toBe('-')
    expect(base.du).toBeCloseTo(onChart.activeOvnHigh, 10)
    expect(offset.px).toBe(onChart.props.labelLift)
    expect(onChart.props.labelLift).toBeGreaterThan(0)

    // Las estadisticas del perfil no se levantan: van bajo el perfil.
    const stats = texts.find((t) => t.key === 'r0-t-sum')
    expect(stats.point.y.du).toBeLessThan(onChart.completedRth[0].profile.low)
    expect(stats.textAlignment).toBe('rightMiddle')
  })

  it('mantiene las etiquetas de nivel dentro del alcance del dibujo', () => {
    // En modo "chart" todo texto se ancla como mucho una vela mas alla del
    // final de su linea, que es hasta donde llega el dibujo.
    const onChart = makeCalculator(indicator, { labelPlacement: 'text' })
    const chartItems = runAndDraw(onChart, bars).graphics.items
    const lineEnds = {}
    for (const group of collect(chartItems, 'LineSegments')) {
      lineEnds[group.key] = Math.max(
        ...group.lines.map((line) => Math.max(line.a.x.du, line.b.x.du))
      )
    }
    for (const text of collect(chartItems, 'Text')) {
      if (text.origin) continue // el dashboard va en coordenadas de marco
      const x = text.point.x.du
      expect(Number.isFinite(x)).toBe(true)
      expect(x).toBeLessThanOrEqual(onChart.lastBarIndex + onChart.props.labelOffset + 1)
    }
    expect(Object.keys(lineEnds).length).toBeGreaterThan(0)
  })

  it('no dibuja las etiquetas de delta salvo que se activen', () => {
    const texts = collect(result.graphics.items, 'Text')
    expect(texts.some((t) => t.key.endsWith('-t-delta'))).toBe(false)
    expect(texts.some((t) => t.key.endsWith('-t-sum'))).toBe(true)
    expect(indicator.params.showProfileDelta.def).toBe(false)

    const withDelta = makeCalculator(indicator, { showProfileDelta: true })
    const deltaTexts = collect(runAndDraw(withDelta, bars).graphics.items, 'Text')
    const delta = deltaTexts.find((t) => t.key.endsWith('-t-delta'))
    expect(delta.text.startsWith('Delta:')).toBe(true)

    // Sin estadisticas ni delta no queda ninguna de las dos.
    const bare = makeCalculator(indicator, { showProfileStats: false, showProfileDelta: false })
    const bareTexts = collect(runAndDraw(bare, bars).graphics.items, 'Text')
    expect(bareTexts.some((t) => t.key.endsWith('-t-sum'))).toBe(false)
    expect(bareTexts.some((t) => t.key.endsWith('-t-delta'))).toBe(false)
  })

  it('dibuja las etiquetas de nivel como pastillas al final de su linea', () => {
    const items = result.graphics.items
    const badge = items.find((item) => item.key === 'kl-onh-bg')
    const text = items.find((item) => item.key === 'kl-onh-t')
    const lineEnd = collect(items, 'LineSegments')
      .find((g) => g.key === 'kl-onh')
      .lines.map((line) => Math.max(line.a.x.du, line.b.x.du))[0]

    // En coordenadas de velas, no ancladas al marco: anclar al marco una `y` en
    // precio invalida el objeto y la aplicacion abandona el resto del dibujo.
    expect(badge.origin).toBeUndefined()
    expect(text.origin).toBeUndefined()

    // Arranca donde acaba la linea y su ancho va en pixeles.
    const points = badge.primitives[0].points
    expect(points[0].x.du).toBe(lineEnd + 1)
    const [widthBase, widthOp, width] = points[1].x.op
    expect(widthBase.du).toBe(lineEnd + 1)
    expect(widthOp).toBe('+')
    expect(width.px).toBeGreaterThan(0)

    // El alto tambien: op(du(precio), '-', px(n)) arriba y '+' abajo.
    const [topBase, topOp, topOffset] = points[0].y.op
    expect(topBase.du).toBeCloseTo(instance.activeOvnHigh, 10)
    expect(topOp).toBe('-')
    expect(topOffset.px).toBeGreaterThan(0)
    expect(points[3].y.op[1]).toBe('+')

    // El texto va centrado dentro de la pastilla y con color legible.
    expect(text.point.y.du).toBeCloseTo(instance.activeOvnHigh, 10)
    expect(text.point.x.op[2].px).toBeCloseTo(width.px / 2, 10)
    expect(text.textAlignment).toBe('centerMiddle')
    expect(text.text).toMatch(/^ONH( \d+%)?$/)
    expect(text.style.fill).toBe(internals.contrastingTextColor(badge.fillStyle.color))

    // La pastilla se dibuja antes que su texto, para quedar debajo.
    expect(items.indexOf(badge)).toBeLessThan(items.indexOf(text))
  })

  it('emite el dashboard antes que cualquier otro texto', () => {
    // Si un objeto posterior resultara invalido, la aplicacion abandona el
    // dibujo a partir de ahi: el dashboard va primero para no perderse.
    const texts = collect(result.graphics.items, 'Text')
    expect(texts[0].key.startsWith('dash-')).toBe(true)
  })

  it('la pastilla es mas ancha cuanto mas largo es el texto', () => {
    const widthOf = (label) => {
      const badge = result.graphics.items.find((item) => item.key === label + '-bg')
      return badge.primitives[0].points[1].x.op[2].px
    }
    // "YPOC 55%" ocupa mas que "ONH".
    expect(widthOf('kl-ypoc')).toBeGreaterThan(widthOf('kl-onh'))
  })

  it('trata un labelPlacement ausente como pastilla', () => {
    // Un indicador ya colocado en el grafico puede no traer los parametros
    // nuevos: la pastilla tiene que seguir siendo el comportamiento base.
    const legacy = makeCalculator(indicator, { labelPlacement: undefined })
    const keys = runAndDraw(legacy, bars).graphics.items.map((item) => item.key)
    expect(keys).toContain('kl-onh-bg')
  })

  it('permite volver a las etiquetas de solo texto', () => {
    const onChart = makeCalculator(indicator, { labelPlacement: 'text' })
    const items = runAndDraw(onChart, bars).graphics.items
    const keys = items.map((item) => item.key)

    expect(keys).not.toContain('kl-onh-bg')
    const label = items.find((item) => item.key === 'kl-onh-t')
    expect(label.origin).toBeUndefined()
    expect(label.point.x.du).toBeGreaterThan(0)
    expect(label.textAlignment).toBe('leftMiddle')
  })

  it('respeta las opciones de visualizacion', () => {
    const minimal = makeCalculator(indicator, {
      showHistogram: false,
      showDashboard: false,
      showKeyLevelLabels: false,
      showProfileLabels: false,
      showProfileStats: false,
    })
    const minimalResult = runAndDraw(minimal, bars)
    expect(collect(minimalResult.graphics.items, 'Shapes')).toHaveLength(0)
    expect(collect(minimalResult.graphics.items, 'Text')).toHaveLength(0)
    expect(collect(minimalResult.graphics.items, 'LineSegments').length).toBeGreaterThan(0)

    const nothing = makeCalculator(indicator, {
      showRth: false,
      showOvernight: false,
      showHistogram: false,
      showDashboard: false,
      showKeyLevelLabels: false,
      showProfileLabels: false,
      showProfileStats: false,
      showOvernightLevels: false,
      showPrevRth: false,
      showIbLevels: false,
      showYpoc: false,
      showPrevWeek: false,
      showWeek2: false,
      showGapLevels: false,
    })
    expect(runAndDraw(nothing, bars).graphics).toBeUndefined()
  })

  it('coloca el perfil a la izquierda o a la derecha segun el parametro', () => {
    const left = makeCalculator(indicator, { profileSide: 'left' })
    const leftItems = runAndDraw(left, bars).graphics.items
    const right = makeCalculator(indicator, { profileSide: 'right' })
    const rightItems = runAndDraw(right, bars).graphics.items

    const record = left.completedRth[0]
    const edges = (items, pick) => {
      const values = []
      for (const group of collect(items, 'Shapes')) {
        if (!group.key.startsWith('r0-')) continue
        for (const primitive of group.primitives) {
          const xs = primitive.points.map((p) => p.x.du)
          values.push(pick(Math.min(...xs), Math.max(...xs)))
        }
      }
      return values
    }

    expect(Math.min(...edges(leftItems, (a) => a))).toBeCloseTo(record.startX, 6)
    expect(Math.max(...edges(rightItems, (a, b) => b))).toBeCloseTo(record.endX, 6)
  })

  it('extendRight prolonga POC/VAH/VAL hasta el borde derecho', () => {
    const plain = makeCalculator(indicator)
    const plainResult = runAndDraw(plain, bars)
    const extended = makeCalculator(indicator, { extendRight: true })
    const extendedResult = runAndDraw(extended, bars)

    const pocLine = (items) =>
      collect(items, 'LineSegments').find((g) => g.key === 'r0-l-poc').lines[0]

    expect(pocLine(plainResult.graphics.items).b.x.du).toBe(plain.completedRth[0].endX)
    expect(pocLine(extendedResult.graphics.items).b.x.du).toBe(
      extended.lastBarIndex + extended.props.labelOffset
    )
  })

  it('no emite graphics antes de la primera vela', () => {
    const empty = makeCalculator(indicator)
    expect(internals.buildGraphics(empty)).toBeUndefined()
  })

  it('omite opacity cuando el trazo es opaco y la envia en escala 0..100', () => {
    // tools/predef.js usa `opacity: style.opacity || 100`, asi que la escala de
    // la app es 0..100: enviar 1 pinta al 1 % y el trazo es invisible.
    const builder = internals.createGraphicsBuilder()
    builder.line('sin', { color: '#fff', width: 1, dash: 1 }, 0, 1, 1, 1)
    builder.line('opaca', { color: '#fff', width: 1, dash: 1, opacity: 100 }, 0, 1, 1, 1)
    builder.line('media', { color: '#fff', width: 1, dash: 1, opacity: 45 }, 0, 1, 1, 1)
    builder.line('minima', { color: '#fff', width: 1, dash: 1, opacity: 0.45 }, 0, 1, 1, 1)
    builder.rect('relleno', { color: '#fff', opacity: 45 }, 0, 2, 1, 1)

    const byKey = Object.fromEntries(builder.build().map((item) => [item.key, item]))
    expect(byKey.sin.lineStyle.opacity).toBeUndefined()
    expect(byKey.opaca.lineStyle.opacity).toBeUndefined()
    expect(byKey.media.lineStyle.opacity).toBe(45)
    // Un valor pensado en escala 0..1 se eleva al minimo visible en vez de desaparecer.
    expect(byKey.minima.lineStyle.opacity).toBe(1)
    expect(byKey.relleno.fillStyle.opacity).toBe(45)
  })

  it('el constructor descarta rectangulos y lineas degenerados', () => {
    const builder = internals.createGraphicsBuilder()
    builder.rect('g', { color: '#fff', opacity: 1 }, 5, 10, 5, 10) // ancho y alto cero
    builder.line('l', { color: '#fff', width: 1, dash: 1, opacity: 1 }, 0, NaN, 1, 2)
    builder.text('t', 0, NaN, 'x', { color: '#fff', size: 11 })
    expect(builder.build()).toEqual([])
  })
})

describe('colores', () => {
  it('acepta hex y nombres web, y cae al valor por defecto si viene vacio', () => {
    expect(internals.safeColor('#123456', '#000')).toBe('#123456')
    expect(internals.safeColor('  red  ', '#000')).toBe('red')
    expect(internals.safeColor('', '#000')).toBe('#000')
    expect(internals.safeColor(undefined, '#000')).toBe('#000')
    expect(internals.safeColor(42, '#000')).toBe('#000')
  })

  it('un color vacio en los parametros no rompe el dibujo', () => {
    const bars = generateBars({ startMs: Date.UTC(2024, 0, 8, 5, 0), minutes: 24 * 60 })
    const instance = makeCalculator(indicator, { rthPocColor: '', onHighColor: '   ' })
    for (let i = 0; i < bars.length - 1; i += 1) instance.map(bars[i], i)
    const last = Object.assign({}, bars[bars.length - 1], { isLast: () => true })
    const items = instance.map(last, bars.length - 1).graphics.items
    for (const item of items) {
      const color = (item.fillStyle && item.fillStyle.color) || (item.lineStyle && item.lineStyle.color) || (item.style && item.style.fill)
      expect(typeof color).toBe('string')
      expect(color.trim().length).toBeGreaterThan(0)
    }
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
