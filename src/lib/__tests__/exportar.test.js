import { describe, it, expect, vi } from 'vitest'

// Mock xlsx before importing
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
    write: vi.fn(() => new ArrayBuffer(0)),
    sheet_to_csv: vi.fn(() => 'csv,data'),
  },
}))

// Mock browser globals
globalThis.Blob = vi.fn(() => ({}))
globalThis.URL.createObjectURL = vi.fn(() => 'blob:test')
globalThis.URL.revokeObjectURL = vi.fn()

describe('exportarExcel', () => {
  it('exporta datos con columnas básicas', async () => {
    const { exportarExcel } = await import('@/lib/utils/exportar')

    const data = [
      { nombre: 'Máquina 1', estado: 'operativa' },
      { nombre: 'Máquina 2', estado: 'en_mantenimiento' },
    ]
    const columns = [
      { key: 'nombre', label: 'Nombre' },
      { key: 'estado', label: 'Estado' },
    ]

    // Should not throw
    await expect(exportarExcel(data, columns, 'test')).resolves.toBeUndefined()
  })

  it('exporta datos con formatters', async () => {
    const { exportarExcel } = await import('@/lib/utils/exportar')

    const data = [
      { total: 1500000, estado: 'pagada' },
    ]
    const columns = [
      {
        key: 'total',
        label: 'Total',
        formatter: (v) => `$${Number(v).toLocaleString('es-CO')}`,
      },
      {
        key: 'estado',
        label: 'Estado',
        formatter: (v) => v === 'pagada' ? 'Pagada' : 'Pendiente',
      },
    ]

    await expect(exportarExcel(data, columns, 'factura', 'Reporte')).resolves.toBeUndefined()
  })

  it('retorna undefined si data está vacío', async () => {
    const { exportarExcel } = await import('@/lib/utils/exportar')
    const result = await exportarExcel([], [{ key: 'a', label: 'A' }], 'test')
    expect(result).toBeUndefined()
  })

  it('retorna undefined si data es null', async () => {
    const { exportarExcel } = await import('@/lib/utils/exportar')
    const result = await exportarExcel(null, [{ key: 'a', label: 'A' }], 'test')
    expect(result).toBeUndefined()
  })
})

describe('exportarCSV', () => {
  it('exporta datos a CSV', async () => {
    const { exportarCSV } = await import('@/lib/utils/exportar')

    const data = [
      { nombre: 'Test', valor: 100 },
    ]
    const columns = [
      { key: 'nombre', label: 'Nombre' },
      { key: 'valor', label: 'Valor' },
    ]

    await expect(exportarCSV(data, columns, 'test')).resolves.toBeUndefined()
  })

  it('retorna undefined si data está vacío', async () => {
    const { exportarCSV } = await import('@/lib/utils/exportar')
    const result = await exportarCSV([], [{ key: 'a', label: 'A' }], 'test')
    expect(result).toBeUndefined()
  })
})

describe('useExportExcel', () => {
  it('retorna una función', async () => {
    const { useExportExcel } = await import('@/lib/utils/exportar')
    const fn = useExportExcel([{ a: 1 }], [{ key: 'a', label: 'A' }], 'test')
    expect(typeof fn).toBe('function')
  })
})
