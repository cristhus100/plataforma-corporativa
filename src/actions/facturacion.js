'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verificarAdmin, formatearError } from './helpers'

/**
 * Crear un nuevo tercero (cliente/proveedor)
 */
export async function crearTercero(formData) {
  try {
    const { supabase } = await verificarAdmin()

    const datos = {
      tipo_documento: formData.tipo_documento || 'NIT',
      numero_documento: formData.numero_documento?.trim(),
      digito_verificacion: formData.digito_verificacion ? Number(formData.digito_verificacion) : null,
      nombre_completo: formData.nombre_completo?.trim(),
      nombre_comercial: formData.nombre_comercial?.trim() || null,
      direccion: formData.direccion || null,
      ciudad: formData.ciudad || null,
      departamento: formData.departamento || null,
      telefono: formData.telefono || null,
      email: formData.email || null,
      regimen_iva: formData.regimen_iva || 'comun',
      regimen_tributario: formData.regimen_tributario || 'ordinario',
      autorretenedor: formData.autorretenedor === true,
      tipo_tercero: formData.tipo_tercero || 'cliente',
      plazo_credito_dias: formData.plazo_credito_dias ? Number(formData.plazo_credito_dias) : 30,
      cupo_credito: formData.cupo_credito ? parseFloat(formData.cupo_credito) : 0,
      notas: formData.notas || null,
      activo: true,
    }

    const { data, error } = await supabase
      .from('terceros')
      .insert([datos])
      .select()
      .single()

    if (error) throw error

    revalidatePath('/facturacion/terceros')
    return { success: true, id: data.id }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Actualizar un tercero existente
 */
export async function actualizarTercero(id, formData) {
  try {
    const { supabase } = await verificarAdmin()

    const datos = { ...formData }
    if (datos.digito_verificacion) datos.digito_verificacion = Number(datos.digito_verificacion)
    if (datos.plazo_credito_dias) datos.plazo_credito_dias = Number(datos.plazo_credito_dias)
    if (datos.cupo_credito) datos.cupo_credito = parseFloat(datos.cupo_credito)
    Object.keys(datos).forEach(k => { if (datos[k] === '') datos[k] = null })

    const { error } = await supabase
      .from('terceros')
      .update(datos)
      .eq('id', id)

    if (error) throw error

    revalidatePath(`/facturacion/terceros/${id}`)
    revalidatePath('/facturacion/terceros')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Eliminar (soft-delete) un tercero
 */
export async function eliminarTercero(id) {
  try {
    const { supabase } = await verificarAdmin()
    const { error } = await supabase
      .from('terceros')
      .update({ activo: false })
      .eq('id', id)
    if (error) throw error

    revalidatePath('/facturacion/terceros')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Crear una nueva factura
 */
export async function crearFactura(formData) {
  try {
    const { supabase } = await verificarAdmin()

    // Obtener el tipo de documento y su consecutivo
    const { data: tipoDoc, error: errTipo } = await supabase
      .from('tipo_documentos_factura')
      .select('*')
      .eq('id', formData.tipo_documento_id)
      .single()

    if (errTipo || !tipoDoc) throw new Error('Tipo de documento no encontrado')

    // Incrementar consecutivo
    const nuevoConsecutivo = (tipoDoc.consecutivo_actual || 0) + 1
    const prefijo = tipoDoc.prefijo
    const numeroFactura = `${prefijo}${String(nuevoConsecutivo).padStart(6, '0')}`

    // Calcular valores
    const items = JSON.parse(formData.items || '[]')
    let subtotal = 0
    let iva = 0
    let baseIva = 0

    items.forEach(item => {
      const cantidad = Number(item.cantidad) || 1
      const valorUnitario = Number(item.valor_unitario) || 0
      const pctIva = Number(item.porcentaje_iva) || 0
      const subtotalItem = cantidad * valorUnitario
      subtotal += subtotalItem
      baseIva += subtotalItem
      iva += subtotalItem * (pctIva / 100)
    })

    const total = subtotal + iva

    // Validación
    if (items.length === 0) throw new Error('La factura debe tener al menos un item')

    // Insertar factura
    const { data: factura, error: errFact } = await supabase
      .from('facturas')
      .insert([{
        tipo_documento_id: Number(formData.tipo_documento_id),
        numero_factura: numeroFactura,
        prefijo,
        consecutivo: nuevoConsecutivo,
        tercero_id: Number(formData.tercero_id),
        fecha_emision: formData.fecha_emision || new Date().toISOString().split('T')[0],
        fecha_vencimiento: formData.fecha_vencimiento,
        subtotal: Math.round(subtotal * 100) / 100,
        iva: Math.round(iva * 100) / 100,
        base_iva: Math.round(baseIva * 100) / 100,
        total: Math.round(total * 100) / 100,
        estado: 'pendiente',
        notas: formData.notas || null,
        orden_servicio: formData.orden_servicio || null,
        creado_por: (await supabase.auth.getUser()).data.user?.id,
      }])
      .select()
      .single()

    if (errFact) throw errFact

    // Insertar items
    const itemsToInsert = items.map(item => ({
      factura_id: factura.id,
      codigo_item: item.codigo_item || null,
      descripcion: item.descripcion,
      cantidad: Number(item.cantidad) || 1,
      unidad: item.unidad || 'UNIDAD',
      valor_unitario: Number(item.valor_unitario) || 0,
      descuento_item: Number(item.descuento_item) || 0,
      porcentaje_iva: Number(item.porcentaje_iva) || 0,
      iva_item: Math.round((Number(item.cantidad || 1) * Number(item.valor_unitario || 0)) * (Number(item.porcentaje_iva || 0) / 100) * 100) / 100,
    }))

    const { error: errItems } = await supabase
      .from('items_factura')
      .insert(itemsToInsert)

    if (errItems) throw errItems

    // Actualizar consecutivo
    await supabase
      .from('tipo_documentos_factura')
      .update({ consecutivo_actual: nuevoConsecutivo })
      .eq('id', formData.tipo_documento_id)

    revalidatePath('/facturacion/facturas')
    return { success: true, id: factura.id, numero: numeroFactura }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Anular una factura
 */
export async function anularFactura(id, motivo) {
  try {
    const { supabase } = await verificarAdmin()
    const { error } = await supabase
      .from('facturas')
      .update({ estado: 'anulada', notas: motivo || 'Anulada por el usuario' })
      .eq('id', id)

    if (error) throw error

    revalidatePath(`/facturacion/facturas/${id}`)
    revalidatePath('/facturacion/facturas')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Registrar un pago/abono a una factura
 */
export async function registrarPago(formData) {
  try {
    const { supabase } = await verificarAdmin()

    const facturaId = Number(formData.factura_id)
    const valor = parseFloat(formData.valor_pagado) || 0
    const valorAplicado = parseFloat(formData.valor_aplicado) || valor

    if (valor <= 0) throw new Error('El valor del pago debe ser mayor a cero')

    // Obtener factura
    const { data: factura, error: errFact } = await supabase
      .from('facturas')
      .select('*')
      .eq('id', facturaId)
      .single()

    if (errFact || !factura) throw new Error('Factura no encontrada')
    if (factura.estado === 'anulada') throw new Error('No se puede pagar una factura anulada')

    // Generar número de recibo
    const timestamp = Date.now()
    const numeroRecibo = `RC-${timestamp}`

    // Insertar recibo
    const { error: errRecibo } = await supabase
      .from('recibos_caja')
      .insert([{
        numero_recibo: numeroRecibo,
        factura_id: facturaId,
        tercero_id: factura.tercero_id,
        fecha_pago: formData.fecha_pago || new Date().toISOString().split('T')[0],
        valor_pagado: valor,
        valor_aplicado: valorAplicado,
        forma_pago: formData.forma_pago || 'transferencia',
        numero_comprobante_transaccion: formData.numero_comprobante_transaccion || null,
        banco_origen: formData.banco_origen || null,
        notas: formData.notas || null,
        creado_por: (await supabase.auth.getUser()).data.user?.id,
      }])

    if (errRecibo) throw errRecibo

    // Determinar nuevo estado de la factura
    const saldoRestante = Number(factura.total) - valorAplicado
    const nuevoEstado = saldoRestante <= 0 ? 'pagada' : 'parcial'

    const { error: errUpdate } = await supabase
      .from('facturas')
      .update({
        estado: nuevoEstado,
        fecha_pago: nuevoEstado === 'pagada' ? (formData.fecha_pago || new Date().toISOString().split('T')[0]) : factura.fecha_pago,
      })
      .eq('id', facturaId)

    if (errUpdate) throw errUpdate

    revalidatePath(`/facturacion/facturas/${facturaId}`)
    revalidatePath('/facturacion/facturas')
    revalidatePath('/facturacion/cartera')
    return { success: true, numero_recibo: numeroRecibo }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Crear nota crédito
 */
export async function crearNotaCredito(data) {
  try {
    const { supabase } = await verificarAdmin()

    const facturaId = Number(data.factura_id)
    const tipoDocId = Number(data.tipo_documento_id)

    const { data: tipoDoc } = await supabase
      .from('tipo_documentos_factura')
      .select('*')
      .eq('id', tipoDocId)
      .single()

    const nuevoConsecutivo = (tipoDoc?.consecutivo_actual || 0) + 1
    const numeroNota = `${tipoDoc?.prefijo || 'NC'}${String(nuevoConsecutivo).padStart(6, '0')}`

    const { data: nota, error } = await supabase
      .from('notas_credito')
      .insert([{
        factura_id: facturaId,
        tipo_documento_id: tipoDocId,
        numero_nota: numeroNota,
        motivo: data.motivo,
        subtotal: parseFloat(data.subtotal) || 0,
        iva: parseFloat(data.iva) || 0,
        total: parseFloat(data.total) || 0,
      }])
      .select()
      .single()

    if (error) throw error

    // Actualizar consecutivo
    await supabase
      .from('tipo_documentos_factura')
      .update({ consecutivo_actual: nuevoConsecutivo })
      .eq('id', tipoDocId)

    revalidatePath(`/facturacion/facturas/${facturaId}`)
    revalidatePath('/facturacion/notas-credito')
    return { success: true, id: nota.id }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Crear nota débito
 */
export async function crearNotaDebito(data) {
  try {
    const { supabase } = await verificarAdmin()

    const facturaId = Number(data.factura_id)
    const tipoDocId = Number(data.tipo_documento_id)

    const { data: tipoDoc } = await supabase
      .from('tipo_documentos_factura')
      .select('*')
      .eq('id', tipoDocId)
      .single()

    const nuevoConsecutivo = (tipoDoc?.consecutivo_actual || 0) + 1
    const numeroNota = `${tipoDoc?.prefijo || 'ND'}${String(nuevoConsecutivo).padStart(6, '0')}`

    const { data: nota, error } = await supabase
      .from('notas_debito')
      .insert([{
        factura_id: facturaId,
        tipo_documento_id: tipoDocId,
        numero_nota: numeroNota,
        motivo: data.motivo,
        subtotal: parseFloat(data.subtotal) || 0,
        iva: parseFloat(data.iva) || 0,
        total: parseFloat(data.total) || 0,
      }])
      .select()
      .single()

    if (error) throw error

    await supabase
      .from('tipo_documentos_factura')
      .update({ consecutivo_actual: nuevoConsecutivo })
      .eq('id', tipoDocId)

    revalidatePath(`/facturacion/facturas/${facturaId}`)
    revalidatePath('/facturacion/notas-debito')
    return { success: true, id: nota.id }
  } catch (err) {
    return formatearError(err)
  }
}
