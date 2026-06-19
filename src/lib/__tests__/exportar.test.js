import { describe, it, expect } from 'vitest'

describe('exportarExcel', () => {
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
