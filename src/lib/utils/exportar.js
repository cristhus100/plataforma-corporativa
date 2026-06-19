'use client'

/**
 * Exporta un arreglo de datos a Excel (.xlsx)
 * @param {Array<Object>} data - Arreglo de objetos a exportar
 * @param {Array<{key: string, label: string, formatter?: Function}>} columns - Definición de columnas
 * @param {string} filename - Nombre del archivo (sin extensión)
 * @param {string} title - Título opcional del reporte
 */
export async function exportarExcel(data, columns, filename = 'reporte', title) {
  if (!data || data.length === 0) return

  const XLSX = await import('xlsx')

  // Mapear datos según columnas
  const rows = data.map(item => {
    const row = {}
    columns.forEach(col => {
      let value = item[col.key]
      if (col.formatter) {
        value = col.formatter(value, item)
      }
      row[col.label] = value ?? ''
    })
    return row
  })

  const ws = XLSX.utils.json_to_sheet(rows)

  // Ajustar ancho de columnas
  const colWidths = columns.map(col => ({
    wch: Math.max(col.label.length * 2, 12),
  }))
  ws['!cols'] = colWidths

  // Crear libro y agregar hoja
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, title || 'Datos')

  // Generar y descargar
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Exporta un arreglo de datos a CSV
 * @param {Array<Object>} data - Arreglo de objetos a exportar
 * @param {Array<{key: string, label: string, formatter?: Function}>} columns - Definición de columnas
 * @param {string} filename - Nombre del archivo (sin extensión)
 */
export async function exportarCSV(data, columns, filename = 'reporte') {
  if (!data || data.length === 0) return

  const XLSX = await import('xlsx')

  const rows = data.map(item => {
    const row = {}
    columns.forEach(col => {
      let value = item[col.key]
      if (col.formatter) {
        value = col.formatter(value, item)
      }
      row[col.label] = value ?? ''
    })
    return row
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  const csv = XLSX.utils.sheet_to_csv(ws)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Hook-friendly: exporta datos actualmente visibles (ya paginados/filtrados)
 * @param {Array} data - Datos visibles actualmente
 * @param {Array} columns - Definición de columnas
 * @param {string} filename
 */
export function useExportExcel(data, columns, filename) {
  return async () => {
    if (!data || data.length === 0) return
    await exportarExcel(data, columns, filename)
  }
}
