/**
 * SERVER ACTIONS — Operaciones de escritura centralizadas
 *
 * Todas las mutaciones de datos se ejecutan desde el servidor,
 * validando autenticación y rol de administrador.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verificarAdmin, formatearError } from './helpers'

// ─── TRABAJADORES ────────────────────────────────────────────

/**
 * Crear un nuevo trabajador
 */
export async function crearTrabajador(formData) {
  try {
    const { supabase } = await verificarAdmin()

    const datos = {
      tipo_documento: formData.tipo_documento || 'CC',
      cedula: formData.cedula,
      primer_apellido: formData.primer_apellido,
      segundo_apellido: formData.segundo_apellido || null,
      nombre: formData.nombre,
      fecha_nacimiento: formData.fecha_nacimiento || null,
      lugar_nacimiento: formData.lugar_nacimiento || null,
      genero: formData.genero || null,
      estado_civil: formData.estado_civil || null,
      rh: formData.rh || null,
      telefono: formData.telefono,
      email: formData.email || null,
      direccion: formData.direccion || null,
      ciudad: formData.ciudad || null,
      departamento: formData.departamento || null,
      cargo_id: formData.cargo_id ? Number(formData.cargo_id) : null,
      departamento_id: formData.departamento_id ? Number(formData.departamento_id) : null,
      frente_trabajo_id: formData.frente_trabajo_id ? Number(formData.frente_trabajo_id) : null,
      fecha_ingreso: formData.fecha_ingreso || null,
      tipo_contrato: formData.tipo_contrato || null,
      salario: formData.salario ? parseFloat(formData.salario) : null,
      eps: formData.eps || null,
      arl: formData.arl || null,
      fondo_pension: formData.fondo_pension || null,
      caja_compensacion: formData.caja_compensacion || null,
      contacto_emergencia_nombre: formData.contacto_emergencia_nombre || null,
      contacto_emergencia_telefono: formData.contacto_emergencia_telefono || null,
      contacto_emergencia_parentesco: formData.contacto_emergencia_parentesco || null,
      activo: true,
    }

    const { data, error } = await supabase
      .from('trabajadores')
      .insert([datos])
      .select()
      .single()

    if (error) throw error

    revalidatePath('/trabajadores')
    return { success: true, id: data.id }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Actualizar un trabajador existente
 */
export async function actualizarTrabajador(id, formData) {
  try {
    const { supabase } = await verificarAdmin()

    const datos = {}
    for (const [key, value] of Object.entries(formData)) {
      if (value !== undefined && value !== '') {
        datos[key] = value
      }
    }
    // Limpiar campos vacíos
    Object.keys(datos).forEach(k => { if (datos[k] === '') datos[k] = null })

    const { error } = await supabase
      .from('trabajadores')
      .update(datos)
      .eq('id', id)

    if (error) throw error

    revalidatePath(`/trabajadores/${id}`)
    revalidatePath('/trabajadores')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Eliminar (soft-delete) un trabajador
 */
export async function eliminarTrabajador(id) {
  try {
    const { supabase } = await verificarAdmin()
    const { error } = await supabase
      .from('trabajadores')
      .update({ activo: false, estado: 'retirado' })
      .eq('id', id)
    if (error) throw error

    revalidatePath('/trabajadores')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

// ─── MAQUINARIA ───────────────────────────────────────────────

/**
 * Subir foto al storage de Supabase (server-side)
 */
async function subirFotoStorage(supabase, bucket, fileName, base64Data) {
  const buffer = Buffer.from(base64Data, 'base64')
  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, buffer, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/jpeg',
    })
  if (error) throw error

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName)
  return publicUrl
}

/**
 * Crear nueva maquinaria
 */
export async function crearMaquinaria(formData) {
  try {
    const { supabase } = await verificarAdmin()

    let fotoUrl = null
    if (formData._fotoBase64 && formData._fotoNombre) {
      const ext = formData._fotoNombre.split('.').pop()
      const fileName = `${formData.codigo_interno || 'maq'}-${Date.now()}.${ext}`
      fotoUrl = await subirFotoStorage(supabase, 'fotos-maquinaria', fileName, formData._fotoBase64)
    }

    const dataToInsert = {
      codigo_interno: formData.codigo_interno,
      nombre: formData.nombre,
      tipo_maquinaria_id: parseInt(formData.tipo_maquinaria_id),
      marca: formData.marca || null,
      modelo: formData.modelo || null,
      anio: formData.anio ? parseInt(formData.anio) : null,
      numero_serie: formData.numero_serie || null,
      numero_motor: formData.numero_motor || null,
      numero_chasis: formData.numero_chasis || null,
      placa: formData.placa || null,
      estado: formData.estado || 'operativa',
      ubicacion_actual: formData.ubicacion_actual || null,
      frente_trabajo_id: formData.frente_trabajo_id ? parseInt(formData.frente_trabajo_id) : null,
      horometro_actual: formData.horometro_actual ? parseFloat(formData.horometro_actual) : null,
      kilometraje_actual: formData.kilometraje_actual ? parseFloat(formData.kilometraje_actual) : null,
      fecha_adquisicion: formData.fecha_adquisicion || null,
      valor_adquisicion: formData.valor_adquisicion ? parseFloat(formData.valor_adquisicion) : null,
      proveedor: formData.proveedor || null,
      observaciones: formData.observaciones || null,
      foto_url: fotoUrl,
      activo: true,
    }

    Object.keys(dataToInsert).forEach(k => { if (dataToInsert[k] === '') dataToInsert[k] = null })

    const { data, error } = await supabase
      .from('maquinaria')
      .insert([dataToInsert])
      .select()

    if (error) throw error

    revalidatePath('/maquinaria')
    return { success: true, id: data?.[0]?.id }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Actualizar maquinaria existente
 */
export async function actualizarMaquinaria(id, formData) {
  try {
    const { supabase } = await verificarAdmin()

    const datos = { ...formData }
    // Limpiar campos numéricos
    if (datos.tipo_maquinaria_id) datos.tipo_maquinaria_id = parseInt(datos.tipo_maquinaria_id)
    if (datos.anio) datos.anio = parseInt(datos.anio)
    if (datos.horometro_actual) datos.horometro_actual = parseFloat(datos.horometro_actual)
    if (datos.kilometraje_actual) datos.kilometraje_actual = parseFloat(datos.kilometraje_actual)
    if (datos.valor_adquisicion) datos.valor_adquisicion = parseFloat(datos.valor_adquisicion)
    if (datos.frente_trabajo_id) datos.frente_trabajo_id = parseInt(datos.frente_trabajo_id)

    Object.keys(datos).forEach(k => { if (datos[k] === '') datos[k] = null })

    const { error } = await supabase
      .from('maquinaria')
      .update(datos)
      .eq('id', id)

    if (error) throw error

    revalidatePath(`/maquinaria/${id}`)
    revalidatePath('/maquinaria')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Eliminar (soft-delete) maquinaria
 */
export async function eliminarMaquinaria(id) {
  try {
    const { supabase } = await verificarAdmin()
    const { error } = await supabase
      .from('maquinaria')
      .update({ activo: false, estado: 'dada_de_baja' })
      .eq('id', id)
    if (error) throw error

    revalidatePath('/maquinaria')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

// ─── VEHÍCULOS ────────────────────────────────────────────────

/**
 * Crear nuevo vehículo
 */
export async function crearVehiculo(formData) {
  try {
    const { supabase } = await verificarAdmin()

    let fotoUrl = null
    if (formData._fotoBase64 && formData._fotoNombre) {
      const ext = formData._fotoNombre.split('.').pop()
      const fileName = `${formData.placa || 'veh'}-${Date.now()}.${ext}`
      fotoUrl = await subirFotoStorage(supabase, 'fotos-maquinaria', fileName, formData._fotoBase64)
    }

    const payload = {
      placa: (formData.placa || '').trim().toUpperCase(),
      nombre: formData.nombre,
      marca: formData.marca || null,
      modelo: formData.modelo || null,
      anio: formData.anio ? parseInt(formData.anio) : null,
      color: formData.color || null,
      tipo: formData.tipo || 'particular',
      numero_motor: formData.numero_motor || null,
      numero_chasis: formData.numero_chasis || null,
      estado: formData.estado || 'operativo',
      kilometraje_actual: formData.kilometraje_actual ? parseFloat(formData.kilometraje_actual) : null,
      foto_url: fotoUrl,
      activo: true,
    }
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })

    const { data, error } = await supabase
      .from('vehiculos')
      .insert([payload])
      .select()

    if (error) throw error

    revalidatePath('/vehiculos')
    return { success: true, id: data?.[0]?.id }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Actualizar vehículo existente
 */
export async function actualizarVehiculo(id, formData) {
  try {
    const { supabase } = await verificarAdmin()

    const datos = { ...formData }
    if (datos.anio) datos.anio = parseInt(datos.anio)
    if (datos.kilometraje_actual) datos.kilometraje_actual = parseFloat(datos.kilometraje_actual)
    Object.keys(datos).forEach(k => { if (datos[k] === '') datos[k] = null })

    const { error } = await supabase
      .from('vehiculos')
      .update(datos)
      .eq('id', id)

    if (error) throw error

    revalidatePath(`/vehiculos/${id}`)
    revalidatePath('/vehiculos')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Eliminar (soft-delete) vehículo
 */
export async function eliminarVehiculo(id) {
  try {
    const { supabase } = await verificarAdmin()
    const { error } = await supabase
      .from('vehiculos')
      .update({ activo: false, estado: 'fuera_servicio' })
      .eq('id', id)
    if (error) throw error

    revalidatePath('/vehiculos')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

// ─── ANUNCIOS / COMUNICADOS ───────────────────────────────────

/**
 * Crear nuevo anuncio
 */
export async function crearAnuncio(formData) {
  try {
    const { supabase } = await verificarAdmin()

    const { error } = await supabase
      .from('comunicados')
      .insert([{
        titulo: formData.titulo.trim(),
        contenido: formData.contenido.trim(),
        tipo: formData.tipo,
        prioridad: formData.prioridad,
        fecha_publicacion: new Date().toISOString(),
        activo: true,
      }])

    if (error) throw error

    revalidatePath('/anuncios')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Actualizar anuncio existente
 */
export async function actualizarAnuncio(id, formData) {
  try {
    const { supabase } = await verificarAdmin()

    const { error } = await supabase
      .from('comunicados')
      .update({
        titulo: formData.titulo.trim(),
        contenido: formData.contenido.trim(),
        tipo: formData.tipo,
        prioridad: formData.prioridad,
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/anuncios')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Eliminar (soft-delete) anuncio
 */
export async function eliminarAnuncio(id) {
  try {
    const { supabase } = await verificarAdmin()
    const { error } = await supabase
      .from('comunicados')
      .update({ activo: false })
      .eq('id', id)
    if (error) throw error

    revalidatePath('/anuncios')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

// ─── CONFIGURACIÓN ─────────────────────────────────────────────

/**
 * Guardar configuración de alertas
 */
export async function guardarConfiguracionAlertas(config) {
  try {
    const { supabase } = await verificarAdmin()

    const { error } = await supabase
      .from('configuracion_alertas')
      .upsert({
        id: 1,
        email_notifications: config.email_notifications ?? true,
        email_destino: config.email_destino || null,
        alertar_vencidos: config.alertar_vencidos ?? true,
        alertar_criticos: config.alertar_criticos ?? true,
        alertar_proximos: config.alertar_proximos ?? true,
        dias_anticipacion: config.dias_anticipacion ?? 30,
      })

    if (error) throw error

    revalidatePath('/configuracion')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

// ─── TURNOS ────────────────────────────────────────────────────

/**
 * Crear asignaciones de turno
 */
export async function crearAsignacionesTurno(asignaciones) {
  try {
    const { supabase } = await verificarAdmin()

    const data = asignaciones.map(a => ({
      trabajador_id: Number(a.trabajador_id),
      tipo_turno_id: Number(a.tipo_turno_id),
      frente_trabajo_id: a.frente_trabajo_id ? Number(a.frente_trabajo_id) : null,
      fecha_inicio: a.fecha_inicio,
      fecha_fin: a.fecha_fin || null,
      estado: 'activo',
      observaciones: a.observaciones || null,
    }))

    const { data: result, error } = await supabase
      .from('asignaciones_turno')
      .insert(data)
      .select()

    if (error) throw error

    revalidatePath('/turnos')
    return { success: true, data: result || [] }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Actualizar una asignación de turno
 */
export async function actualizarAsignacionTurno(id, cambios) {
  try {
    const { supabase } = await verificarAdmin()

    const { data: result, error } = await supabase
      .from('asignaciones_turno')
      .update(cambios)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/turnos')
    return { success: true, data: result }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Eliminar (soft-delete) una asignación de turno
 */
export async function eliminarAsignacionTurno(id) {
  try {
    const { supabase } = await verificarAdmin()

    const { error } = await supabase
      .from('asignaciones_turno')
      .update({ activo: false, estado: 'inactivo' })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/turnos')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

// ─── ASISTENCIA TURNOS ─────────────────────────────────────────

/**
 * Registrar asistencia de un trabajador
 */
export async function registrarAsistenciaTurno(fecha, trabajadorId, tipoTurnoId, estado) {
  try {
    const { supabase } = await verificarAdmin()

    const { error } = await supabase
      .from('registro_asistencia_turno')
      .upsert({
        fecha,
        trabajador_id: Number(trabajadorId),
        tipo_turno_id: Number(tipoTurnoId),
        estado,
      }, {
        onConflict: 'fecha,trabajador_id,tipo_turno_id',
      })

    if (error) throw error

    revalidatePath('/turnos/asistencia')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Registrar asistencia masiva
 */
export async function registrarAsistenciaMasiva(registros) {
  try {
    const { supabase } = await verificarAdmin()

    const { error } = await supabase
      .from('registro_asistencia_turno')
      .upsert(
        registros.map(r => ({
          fecha: r.fecha,
          trabajador_id: Number(r.trabajador_id),
          tipo_turno_id: Number(r.tipo_turno_id),
          estado: r.estado,
        })),
        { onConflict: 'fecha,trabajador_id,tipo_turno_id' }
      )

    if (error) throw error

    revalidatePath('/turnos/asistencia')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

// ─── AUDITORÍAS ───────────────────────────────────────────────

/**
 * Registrar resultado de auditoría (checklist diario)
 */
export async function guardarChecklistAuditoria(frenteId, respuestas) {
  try {
    const { supabase } = await verificarAdmin()

    // Implementar cuando el checklist diario esté disponible en la DB
    console.log('Checklist guardado (pendiente implementación DB):', { frenteId, respuestas })

    revalidatePath('/auditorias')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}
