'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verificarAdmin, formatearError, validate } from './helpers'
import { periodoNominaSchema, novedadNominaSchema, pagoNominaSchema, prestacionSchema } from '@/lib/validaciones/nomina'
import { liquidarNomina, generarCodigoPeriodo, generarCodigoNomina } from '@/lib/utils/nomina'

/**
 * Crear un período de nómina
 */
export async function crearPeriodoNomina(formData) {
  try {
    const { supabase } = await verificarAdmin()

    const validacion = validate(periodoNominaSchema, formData)
    if (!validacion.success) throw new Error(validacion.error)
    const datos = validacion.data

    const codigo = generarCodigoPeriodo(datos.ano, datos.mes, datos.numero_periodo)

    const { data, error } = await supabase
      .from('periodos_nomina')
      .insert([{
        codigo,
        nombre: datos.nombre || `${datos.tipo || 'Quincenal'} ${datos.mes}/${datos.ano}`,
        tipo: datos.tipo || 'quincenal',
        ano: datos.ano,
        mes: datos.mes,
        numero_periodo: datos.numero_periodo,
        fecha_inicio: datos.fecha_inicio,
        fecha_fin: datos.fecha_fin,
        fecha_pago: datos.fecha_pago || null,
        estado: 'abierto',
        creado_por: (await supabase.auth.getUser()).data.user?.id,
        observaciones: datos.observaciones || null,
      }])
      .select()
      .single()

    if (error) throw error

    revalidatePath('/nomina')
    return { success: true, id: data.id }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Cerrar un período de nómina
 */
export async function cerrarPeriodoNomina(id) {
  try {
    const { supabase } = await verificarAdmin()
    const { error } = await supabase
      .from('periodos_nomina')
      .update({ estado: 'cerrado' })
      .eq('id', id)

    if (error) throw error

    revalidatePath(`/nomina/${id}`)
    revalidatePath('/nomina')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Generar nómina para un período: calcula liquidación para todos
 * los trabajadores activos y crea registros en nominas + detalle_nomina
 */
export async function generarNomina(periodoId) {
  try {
    const { supabase } = await verificarAdmin()

    // Obtener período
    const { data: periodo, error: errPeriodo } = await supabase
      .from('periodos_nomina')
      .select('*')
      .eq('id', periodoId)
      .single()

    if (errPeriodo || !periodo) throw new Error('Período de nómina no encontrado')
    if (periodo.estado !== 'abierto') throw new Error('El período no está abierto')

    // Obtener trabajadores activos
    const { data: trabajadores, error: errTrab } = await supabase
      .from('trabajadores')
      .select('*')
      .eq('activo', true)
      .eq('estado', 'activo')
      .not('salario', 'is', null)

    if (errTrab) throw errTrab
    if (!trabajadores || trabajadores.length === 0) {
      throw new Error('No hay trabajadores activos con salario asignado')
    }

    const diasLaborados = periodo.tipo === 'quincenal' ? 15 : 30

    // Liquidar cada trabajador
    const nominasCreadas = []

    for (const trabajador of trabajadores) {
      const liquidacion = liquidarNomina(
        trabajador,
        { ...periodo, dias_laborados: diasLaborados },
        {} // novedades (vacío por ahora, se pueden agregar después)
      )

      const codigoNomina = generarCodigoNomina(
        periodo.ano, periodo.mes, periodo.numero_periodo, trabajador.id
      )

      const { data: nomina, error: errNomina } = await supabase
        .from('nominas')
        .insert([{
          periodo_nomina_id: periodoId,
          trabajador_id: trabajador.id,
          codigo_nomina: codigoNomina,
          salario_base: liquidacion.salario_base,
          dias_laborados: liquidacion.dias_laborados,
          sueldo_basico: liquidacion.devengos.sueldo_basico,
          auxilio_transporte: liquidacion.devengos.auxilio_transporte,
          horas_extras_diurnas: liquidacion.devengos.horas_extras_diurnas,
          horas_extras_nocturnas: liquidacion.devengos.horas_extras_nocturnas,
          horas_extras_dominicales: liquidacion.devengos.horas_extras_dominicales,
          horas_recargo_nocturno: liquidacion.devengos.horas_recargo_nocturno,
          horas_recargo_dominical: liquidacion.devengos.horas_recargo_dominical,
          comisiones: liquidacion.devengos.comisiones,
          bonificaciones: liquidacion.devengos.bonificaciones,
          otros_devengos: liquidacion.devengos.otros_devengos,
          deduccion_salud: liquidacion.deducciones.salud,
          deduccion_pension: liquidacion.deducciones.pension,
          deduccion_fondo_solidaridad: liquidacion.deducciones.fondo_solidaridad,
          embargos: liquidacion.deducciones.embargos,
          libranzas: liquidacion.deducciones.libranzas,
          otras_deducciones: liquidacion.deducciones.otras_deducciones,
          aporte_salud_empleador: liquidacion.aportes_empleador.salud,
          aporte_pension_empleador: liquidacion.aportes_empleador.pension,
          aporte_arl_empleador: liquidacion.aportes_empleador.arl,
          aporte_caja_compensacion: liquidacion.aportes_empleador.caja_compensacion,
          aporte_sena: liquidacion.aportes_empleador.sena,
          aporte_icbf: liquidacion.aportes_empleador.icbf,
          pagado: false,
        }])
        .select()
        .single()

      if (errNomina) {
        console.error(`Error creando nómina para ${trabajador.nombre}:`, errNomina)
        continue
      }

      // Crear detalle itemizado
      const detalles = []
      if (liquidacion.devengos.sueldo_basico > 0) {
        detalles.push({
          nomina_id: nomina.id,
          tipo_registro: 'devengo',
          concepto: `Sueldo básico (${diasLaborados} días)`,
          dias: diasLaborados,
          base_calculo: liquidacion.salario_base,
          valor: liquidacion.devengos.sueldo_basico,
          formula: `${liquidacion.salario_base} / 30 * ${diasLaborados}`,
        })
      }
      if (liquidacion.devengos.auxilio_transporte > 0) {
        detalles.push({
          nomina_id: nomina.id,
          tipo_registro: 'devengo',
          concepto: 'Auxilio de transporte',
          base_calculo: liquidacion.devengos.auxilio_transporte,
          valor: liquidacion.devengos.auxilio_transporte,
        })
      }
      detalles.push({
        nomina_id: nomina.id,
        tipo_registro: 'deduccion',
        concepto: 'Aporte a salud (4%)',
        base_calculo: liquidacion.ibc,
        valor: liquidacion.deducciones.salud,
        porcentaje: 4,
        formula: `${liquidacion.ibc} * 4%`,
      })
      detalles.push({
        nomina_id: nomina.id,
        tipo_registro: 'deduccion',
        concepto: 'Aporte a pensión (4%)',
        base_calculo: liquidacion.ibc,
        valor: liquidacion.deducciones.pension,
        porcentaje: 4,
        formula: `${liquidacion.ibc} * 4%`,
      })
      detalles.push({
        nomina_id: nomina.id,
        tipo_registro: 'aporte_empleador',
        concepto: 'Aporte salud empleador (8.5%)',
        base_calculo: liquidacion.ibc,
        valor: liquidacion.aportes_empleador.salud,
        porcentaje: 8.5,
      })
      detalles.push({
        nomina_id: nomina.id,
        tipo_registro: 'aporte_empleador',
        concepto: 'Aporte pensión empleador (12%)',
        base_calculo: liquidacion.ibc,
        valor: liquidacion.aportes_empleador.pension,
        porcentaje: 12,
      })
      detalles.push({
        nomina_id: nomina.id,
        tipo_registro: 'aporte_empleador',
        concepto: 'Aporte ARL',
        base_calculo: liquidacion.ibc,
        valor: liquidacion.aportes_empleador.arl,
      })
      detalles.push({
        nomina_id: nomina.id,
        tipo_registro: 'aporte_empleador',
        concepto: 'Caja de Compensación (4%)',
        base_calculo: liquidacion.ibc,
        valor: liquidacion.aportes_empleador.caja_compensacion,
        porcentaje: 4,
      })
      detalles.push({
        nomina_id: nomina.id,
        tipo_registro: 'aporte_empleador',
        concepto: 'SENA (2%)',
        base_calculo: liquidacion.ibc,
        valor: liquidacion.aportes_empleador.sena,
        porcentaje: 2,
      })
      detalles.push({
        nomina_id: nomina.id,
        tipo_registro: 'aporte_empleador',
        concepto: 'ICBF (3%)',
        base_calculo: liquidacion.ibc,
        valor: liquidacion.aportes_empleador.icbf,
        porcentaje: 3,
      })

      if (detalles.length > 0) {
        const { error: errDet } = await supabase
          .from('detalle_nomina')
          .insert(detalles)
        if (errDet) console.error('Error creando detalle:', errDet)
      }

      nominasCreadas.push({ id: nomina.id, trabajador_id: trabajador.id, codigo: codigoNomina })
    }

    // Cerrar el período
    await supabase
      .from('periodos_nomina')
      .update({ estado: 'liquidado' })
      .eq('id', periodoId)

    revalidatePath(`/nomina/${periodoId}`)
    revalidatePath('/nomina')
    return { success: true, data: nominasCreadas }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Marcar nómina como pagada
 */
export async function pagarNomina(nominaId, dataPago) {
  try {
    const { supabase } = await verificarAdmin()

    const validacion = validate(pagoNominaSchema, dataPago)
    if (!validacion.success) throw new Error(validacion.error)
    const d = validacion.data

    const updates = {
      pagado: true,
      fecha_pago: d.fecha_pago || new Date().toISOString(),
      medio_pago: d.medio_pago,
      numero_comprobante: d.numero_comprobante || null,
    }

    const { error } = await supabase
      .from('nominas')
      .update(updates)
      .eq('id', nominaId)

    if (error) throw error

    revalidatePath(`/nomina/${nominaId}`)
    revalidatePath('/nomina')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Agregar una novedad de nómina
 */
export async function agregarNovedad(formData) {
  try {
    const { supabase } = await verificarAdmin()

    const validacion = validate(novedadNominaSchema, formData)
    if (!validacion.success) throw new Error(validacion.error)
    const d = validacion.data

    const { data, error } = await supabase
      .from('novedades_nomina')
      .insert([{
        trabajador_id: d.trabajador_id,
        tipo_novedad_id: d.tipo_novedad_id,
        periodo_nomina_id: d.periodo_nomina_id || null,
        fecha_inicio: d.fecha_inicio,
        fecha_fin: d.fecha_fin || null,
        dias: d.dias || null,
        valor: d.valor || 0,
        descripcion: d.descripcion || null,
        estado: 'pendiente',
        creado_por: (await supabase.auth.getUser()).data.user?.id,
      }])
      .select()
      .single()

    if (error) throw error

    revalidatePath('/nomina/novedades')
    return { success: true, id: data.id }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Liquidar prestaciones sociales para un trabajador
 */
export async function liquidarPrestaciones(formData) {
  try {
    const { supabase } = await verificarAdmin()

    const validacion = validate(prestacionSchema, formData)
    if (!validacion.success) throw new Error(validacion.error)
    const d = validacion.data

    const { data, error } = await supabase
      .from('liquidacion_prestaciones')
      .insert([{
        trabajador_id: d.trabajador_id,
        tipo_liquidacion: d.tipo_liquidacion,
        periodo_inicio: d.periodo_inicio,
        periodo_fin: d.periodo_fin,
        salario_base: d.salario_base,
        auxilio_transporte_base: d.auxilio_transporte_base || 0,
        dias_trabajados: d.dias_trabajados,
        valor_calculado: d.valor_calculado,
        valor_pagado: d.valor_pagado || 0,
        fecha_pago: d.fecha_pago || null,
        pagado: (d.valor_pagado || 0) > 0,
        observaciones: d.observaciones || null,
      }])
      .select()
      .single()

    if (error) throw error

    revalidatePath('/nomina/prestaciones')
    return { success: true, id: data.id }
  } catch (err) {
    return formatearError(err)
  }
}
