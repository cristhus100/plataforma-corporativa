'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verificarAdmin, formatearError, validate } from './helpers'
import { comprobanteSchema, cuentaSchema } from '@/lib/validaciones/contabilidad'

/**
 * Crear un comprobante contable con sus asientos
 */
export async function crearComprobante(formData) {
  try {
    const { supabase } = await verificarAdmin()

    const validacion = validate(comprobanteSchema, formData)
    if (!validacion.success) throw new Error(validacion.error)
    const datos = validacion.data

    const lineas = JSON.parse(formData.lineas || '[]')
    if (lineas.length === 0) throw new Error('El comprobante debe tener al menos una línea')

    // Validar suma débitos = créditos
    const totalDebito = lineas
      .filter(l => l.naturaleza === 'debito')
      .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)

    const totalCredito = lineas
      .filter(l => l.naturaleza === 'credito')
      .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)

    if (Math.abs(totalDebito - totalCredito) > 0.01) {
      throw new Error(`Los débitos (${totalDebito}) no cuadran con los créditos (${totalCredito})`)
    }

    // Obtener tipo de comprobante y su consecutivo
    const { data: tipoComp, error: errTipo } = await supabase
      .from('tipo_comprobantes')
      .select('*')
      .eq('id', formData.tipo_comprobante_id)
      .single()

    if (errTipo || !tipoComp) throw new Error('Tipo de comprobante no encontrado')

    // Generar número de comprobante
    const { count } = await supabase
      .from('comprobantes')
      .select('*', { count: 'exact', head: true })

    const consecutivo = (count || 0) + 1
    const numeroComprobante = `${tipoComp.prefijo}-${String(consecutivo).padStart(4, '0')}`

    // Insertar comprobante
    const { data: comprobante, error: errComp } = await supabase
      .from('comprobantes')
      .insert([{
        tipo_comprobante_id: Number(datos.tipo_comprobante_id),
        numero_comprobante: numeroComprobante,
        fecha: datos.fecha || new Date().toISOString(),
        concepto: datos.concepto,
        origen: datos.origen || 'manual',
        total_debito: totalDebito,
        total_credito: totalCredito,
        creado_por: (await supabase.auth.getUser()).data.user?.id,
      }])
      .select()
      .single()

    if (errComp) throw errComp

    // Insertar asientos
    const asientos = lineas.map(linea => ({
      comprobante_id: comprobante.id,
      cuenta_id: Number(linea.cuenta_id),
      tercero_id: linea.tercero_id ? Number(linea.tercero_id) : null,
      descripcion: linea.descripcion || datos.concepto,
      naturaleza: linea.naturaleza,
      valor: parseFloat(linea.valor) || 0,
    }))

    const { error: errAsientos } = await supabase
      .from('asientos_contables')
      .insert(asientos)

    if (errAsientos) throw errAsientos

    revalidatePath('/contabilidad/comprobantes')
    return { success: true, id: comprobante.id, numero: numeroComprobante }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Anular un comprobante contable
 */
export async function anularComprobante(id, motivo) {
  try {
    const { supabase } = await verificarAdmin()
    const { error } = await supabase
      .from('comprobantes')
      .update({
        estado: 'anulado',
        motivo_anulacion: motivo || 'Anulado por el usuario',
        fecha_anulacion: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath(`/contabilidad/comprobante/${id}`)
    revalidatePath('/contabilidad/comprobantes')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Crear una cuenta en el PUC
 */
export async function crearCuenta(formData) {
  try {
    const { supabase } = await verificarAdmin()

    const validacion = validate(cuentaSchema, formData)
    if (!validacion.success) throw new Error(validacion.error)
    const d = validacion.data

    const datos = {
      codigo: d.codigo,
      nombre: d.nombre,
      tipo: d.tipo,
      naturaleza: d.naturaleza,
      nivel: d.nivel,
      codigo_padre: d.codigo_padre || null,
      activa: d.activa !== false,
      acepta_movimiento: d.acepta_movimiento !== false,
      descripcion: d.descripcion || null,
      pide_tercero: d.pide_tercero === true,
      pide_centro_costo: d.pide_centro_costo === true,
    }

    const { data, error } = await supabase
      .from('plan_cuentas')
      .insert([datos])
      .select()
      .single()

    if (error) throw error

    revalidatePath('/contabilidad/puc')
    return { success: true, id: data.id }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Actualizar una cuenta del PUC
 */
export async function actualizarCuenta(id, formData) {
  try {
    const { supabase } = await verificarAdmin()

    const datos = { ...formData }
    Object.keys(datos).forEach(k => { if (datos[k] === '') datos[k] = null })

    const { error } = await supabase
      .from('plan_cuentas')
      .update(datos)
      .eq('id', id)

    if (error) throw error

    revalidatePath('/contabilidad/puc')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}
