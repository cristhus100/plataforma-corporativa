'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verificarAdmin, formatearError } from './helpers'

/**
 * Crear un comprobante contable con sus asientos
 */
export async function crearComprobante(formData) {
  try {
    const { supabase } = await verificarAdmin()

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
        tipo_comprobante_id: Number(formData.tipo_comprobante_id),
        numero_comprobante: numeroComprobante,
        fecha: formData.fecha || new Date().toISOString(),
        concepto: formData.concepto,
        origen: formData.origen || 'manual',
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
      descripcion: linea.descripcion || formData.concepto,
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

    const datos = {
      codigo: formData.codigo?.trim(),
      nombre: formData.nombre?.trim(),
      tipo: formData.tipo,
      naturaleza: formData.naturaleza,
      nivel: Number(formData.nivel),
      codigo_padre: formData.codigo_padre || null,
      activa: formData.activa !== false,
      acepta_movimiento: formData.acepta_movimiento !== false,
      descripcion: formData.descripcion || null,
      pide_tercero: formData.pide_tercero === true,
      pide_centro_costo: formData.pide_centro_costo === true,
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
