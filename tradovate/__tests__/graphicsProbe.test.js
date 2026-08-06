import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PROBE_FILE = path.resolve(HERE, '../graphicsProbe.js')

const predefStub = {
  paramSpecs: {
    number: (def, step, min) => ({ type: 'number', def, restrictions: { step, min } }),
  },
}
const metaStub = { InputType: { BARS: 'bars' }, AreaChoice: { OVERLAY: 'overlay' } }
const graphicsStub = {
  du: (value) => ({ du: value }),
  px: (value) => ({ px: value }),
  op: (a, operator, b) => ({ op: [a, operator, b] }),
}

function loadProbe() {
  const source = fs.readFileSync(PROBE_FILE, 'utf8')
  const table = {
    './tools/predef': predefStub,
    './tools/meta': metaStub,
    './tools/graphics': graphicsStub,
  }
  const sandbox = { exports: {} }
  new Function('module', 'exports', 'require', source)(sandbox, sandbox.exports, (id) => table[id])
  return sandbox.exports
}

function makeBar(index, close, isLast) {
  return {
    index: () => index,
    close: () => close,
    value: () => close,
    timestamp: () => new Date(0),
    isLast: () => isLast,
  }
}

function run(probe, { isLast = true } = {}) {
  const instance = new probe.calculator()
  instance.props = { widthBars: probe.params.widthBars.def }
  instance.init()
  instance.map(makeBar(99, 29500, false), 99)
  return instance.map(makeBar(100, 29500, isLast), 100)
}

let probe

beforeAll(() => {
  probe = loadProbe()
})

describe('graphicsProbe', () => {
  it('se exporta como indicador valido', () => {
    expect(probe.name).toBe('graphicsProbe')
    expect(typeof probe.calculator).toBe('function')
    expect(probe.inputType).toBe('bars')
  })

  it('solo dibuja en la ultima vela', () => {
    expect(run(probe, { isLast: false }).graphics).toBeUndefined()
    expect(run(probe).graphics.items.length).toBeGreaterThan(0)
  })

  it('emite las ocho variantes mas la linea de control, cada una etiquetada', () => {
    const items = run(probe).graphics.items
    const keys = items.map((item) => item.key)

    for (const suffix of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      expect(keys, `variante ${suffix}`).toContain(`probe-${suffix}`)
    }
    expect(keys).toContain('probe-ref')

    const labels = items.filter((item) => item.tag === 'Text')
    expect(labels).toHaveLength(9) // 8 variantes + control
    for (const label of labels) {
      expect(typeof label.text).toBe('string')
      expect(Number.isFinite(label.point.y.du)).toBe(true)
    }
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('cada variante prueba una construccion distinta', () => {
    const byKey = Object.fromEntries(run(probe).graphics.items.map((item) => [item.key, item]))

    // A: tamano en pixeles. B: el mismo Rectangle con tamano en unidades de dominio.
    expect(byKey['probe-a'].primitives[0].size.width.px).toBe(150)
    expect(byKey['probe-b'].primitives[0].size.width.du).toBeGreaterThan(0)
    expect(byKey['probe-a'].primitives[0].tag).toBe('Rectangle')

    // C/D/E: mismo poligono, distinta opacidad, para aislar la escala de opacity.
    expect(byKey['probe-c'].primitives[0].tag).toBe('Polygon')
    expect(byKey['probe-c'].fillStyle.opacity).toBe(1)
    expect(byKey['probe-d'].fillStyle.opacity).toBe(0.45)
    expect(byKey['probe-e'].fillStyle.opacity).toBeUndefined()

    // F: identica a E pero sin global, para aislar el ambito.
    expect(byKey['probe-f'].global).toBeUndefined()
    expect(byKey['probe-e'].global).toBe(true)

    // G: contorno en vez de relleno. H: Instancing con color RGB.
    expect(byKey['probe-g'].tag).toBe('ContourShapes')
    expect(byKey['probe-g'].lineStyle.lineWidth).toBe(2)
    expect(byKey['probe-h'].tag).toBe('Instancing')
    expect(byKey['probe-h'].instances[0].color).toEqual({ r: 0.93, g: 0.25, b: 0.55 })

    // Control: una linea, que ya sabemos que se dibuja.
    expect(byKey['probe-ref'].tag).toBe('LineSegments')
  })

  it('todas las variantes ocupan la misma franja horizontal', () => {
    const items = run(probe).graphics.items
    const polygons = items.filter((item) => item.primitives && item.primitives[0].points)
    const xs = polygons.map((item) => item.primitives[0].points.map((p) => p.x.du))
    for (const corners of xs) {
      expect(Math.min(...corners)).toBe(Math.min(...xs[0]))
      expect(Math.max(...corners)).toBe(Math.max(...xs[0]))
    }
  })
})
