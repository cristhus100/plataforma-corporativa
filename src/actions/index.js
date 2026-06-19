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
import { verificarAdmin, formatearError, validate } from './helpers'
import { z } from 'zod'
import { trabajadorSchema } from '@/lib/validaciones/trabajador'
import { maquinariaSchema } from '@/lib/validaciones/maquinaria'
import { vehiculoSchema } from '@/lib/validaciones/vehiculo'
import { anuncioSchema } from '@/lib/validaciones/anuncio'
import { frenteSchema } from '@/lib/validaciones/frente'
import { asignacionTurnoSchema, asistenciaTurnoSchema, asistenciaMasivaSchema } from '@/lib/validaciones/turnos'

// ─── TRABAJADORES ────────────────────────────────────────────

/**
 * Crear un nuevo trabajador
 */
export async function crearTrabajador(formData) {
  try {
    const { supabase } = await verificarAdmin()

    const validacion = validate(trabajadorSchema, formData)
    if (!validacion.success) throw new Error(validacion.error)
    const datos = {
      ...validacion.data,
      tipo_documento: validacion.data.tipo_documento || 'CC',
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

    const validacion = validate(trabajadorSchema, formData)
    if (!validacion.success) throw new Error(validacion.error)
    const datos = { ...validacion.data }
    Object.keys(datos).forEach(k => { if (datos[k] === '' || datos[k] === undefined) delete datos[k] })

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

    // Validar datos (limpiando campos temporales _foto*)
    const dataToValidate = { ...formData }
    delete dataToValidate._fotoBase64
    delete dataToValidate._fotoNombre
    const validacion = validate(maquinariaSchema, dataToValidate)
    if (!validacion.success) throw new Error(validacion.error)
    let datosValidados = validacion.data

    let fotoUrl = null
    if (formData._fotoBase64 && formData._fotoNombre) {
      const ext = formData._fotoNombre.split('.').pop()
      const fileName = `${datosValidados.codigo_interno || 'maq'}-${Date.now()}.${ext}`
      fotoUrl = await subirFotoStorage(supabase, 'fotos-maquinaria', fileName, formData._fotoBase64)
    }

    const dataToInsert = {
      ...datosValidados,
      estado: datosValidados.estado || 'operativa',
      foto_url: fotoUrl,
      activo: true,
    }

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

    const dataToValidate = { ...formData }
    delete dataToValidate._fotoBase64
    delete dataToValidate._fotoNombre
    const validacion = validate(maquinariaSchema, dataToValidate)
    if (!validacion.success) throw new Error(validacion.error)
    const datos = { ...validacion.data }
    Object.keys(datos).forEach(k => { if (datos[k] === '' || datos[k] === null) delete datos[k] })

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

    // Validar datos (limpiando campos temporales _foto*)
    const dataToValidate = { ...formData }
    delete dataToValidate._fotoBase64
    delete dataToValidate._fotoNombre
    const validacion = validate(vehiculoSchema, dataToValidate)
    if (!validacion.success) throw new Error(validacion.error)
    let datosValidados = validacion.data

    let fotoUrl = null
    if (formData._fotoBase64 && formData._fotoNombre) {
      const ext = formData._fotoNombre.split('.').pop()
      const fileName = `${datosValidados.placa || 'veh'}-${Date.now()}.${ext}`
      fotoUrl = await subirFotoStorage(supabase, 'fotos-maquinaria', fileName, formData._fotoBase64)
    }

    const payload = {
      ...datosValidados,
      placa: (datosValidados.placa || '').toUpperCase(),
      estado: datosValidados.estado || 'operativo',
      foto_url: fotoUrl,
      activo: true,
    }

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

    const dataToValidate = { ...formData }
    delete dataToValidate._fotoBase64
    delete dataToValidate._fotoNombre
    const validacion = validate(vehiculoSchema, dataToValidate)
    if (!validacion.success) throw new Error(validacion.error)
    const datos = { ...validacion.data }
    Object.keys(datos).forEach(k => { if (datos[k] === '' || datos[k] === null) delete datos[k] })

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

    const validacion = validate(anuncioSchema, formData)
    if (!validacion.success) throw new Error(validacion.error)
    const datos = validacion.data

    const { error } = await supabase
      .from('comunicados')
      .insert([{
        titulo: datos.titulo,
        contenido: datos.contenido,
        tipo: datos.tipo || 'general',
        prioridad: datos.prioridad || 'media',
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

    const validacion = validate(anuncioSchema, formData)
    if (!validacion.success) throw new Error(validacion.error)
    const datos = validacion.data

    const { error } = await supabase
      .from('comunicados')
      .update({
        titulo: datos.titulo,
        contenido: datos.contenido,
        tipo: datos.tipo,
        prioridad: datos.prioridad,
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

    const validacion = validate(
      z.object({
        email_notifications: z.boolean().optional(),
        email_destino: z.string().email().optional().nullable(),
        alertar_vencidos: z.boolean().optional(),
        alertar_criticos: z.boolean().optional(),
        alertar_proximos: z.boolean().optional(),
        dias_anticipacion: z.coerce.number().int().nonnegative().optional(),
      }).passthrough(),
      config
    )
    if (!validacion.success) throw new Error(validacion.error)

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

    // Validar cada asignación individual
    for (const a of asignaciones) {
      const v = validate(asignacionTurnoSchema, a)
      if (!v.success) throw new Error(v.error)
    }

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

    const validacion = validate(asistenciaTurnoSchema, {
      fecha,
      trabajador_id: trabajadorId,
      tipo_turno_id: tipoTurnoId,
      estado,
    })
    if (!validacion.success) throw new Error(validacion.error)

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

    // Validar cada registro
    for (const r of registros) {
      const v = validate(asistenciaTurnoSchema, r)
      if (!v.success) throw new Error(v.error)
    }

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

    console.log('Checklist guardado (pendiente implementación DB):', { frenteId, respuestas })

    revalidatePath('/auditorias')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

// ─── FRENTES DE TRABAJO ────────────────────────────────────────

/**
 * Crear un frente de trabajo
 */
export async function crearFrente(formData) {
  try {
    const { supabase } = await verificarAdmin()

    const validacion = validate(frenteSchema, formData)
    if (!validacion.success) throw new Error(validacion.error)
    const datos = validacion.data

    const { data, error } = await supabase
      .from('frentes_trabajo')
      .insert([{
        codigo: datos.codigo.toUpperCase(),
        nombre: datos.nombre,
        ubicacion: datos.ubicacion || null,
        ciudad: datos.ciudad || null,
        departamento: datos.departamento || null,
        activo: true,
      }])
      .select()
      .single()

    if (error) throw error

    revalidatePath('/configuracion')
    return { success: true, id: data.id }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Actualizar un frente de trabajo
 */
export async function actualizarFrente(id, formData) {
  try {
    const { supabase } = await verificarAdmin()

    const validacion = validate(frenteSchema, formData)
    if (!validacion.success) throw new Error(validacion.error)
    const datos = {
      codigo: validacion.data.codigo?.toUpperCase(),
      nombre: validacion.data.nombre,
      ubicacion: validacion.data.ubicacion || null,
      ciudad: validacion.data.ciudad || null,
      departamento: validacion.data.departamento || null,
      activo: formData.activo !== undefined ? formData.activo : true,
    }
    Object.keys(datos).forEach(k => { if (datos[k] === '' || datos[k] === undefined) datos[k] = null })

    const { error } = await supabase
      .from('frentes_trabajo')
      .update(datos)
      .eq('id', id)

    if (error) throw error

    revalidatePath('/configuracion')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Eliminar (soft-delete) un frente de trabajo
 */
export async function eliminarFrente(id) {
  try {
    const { supabase } = await verificarAdmin()

    const { error } = await supabase
      .from('frentes_trabajo')
      .update({ activo: false })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/configuracion')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

// ─── TIPOS DE MAQUINARIA ──────────────────────────────────────

/**
 * Crear un tipo de maquinaria
 */
export async function crearTipoMaquinaria(formData) {
  try {
    const { supabase } = await verificarAdmin()

    const validacion = validate(
      z.object({ nombre: z.string().min(1, 'Nombre es requerido').trim(), descripcion: z.string().optional().nullable() }).passthrough(),
      formData
    )
    if (!validacion.success) throw new Error(validacion.error)
    const datos = validacion.data

    const { data, error } = await supabase
      .from('tipos_maquinaria')
      .insert([{
        nombre: datos.nombre,
        descripcion: datos.descripcion || null,
      }])
      .select()
      .single()

    if (error) throw error

    revalidatePath('/configuracion')
    return { success: true, id: data.id }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Actualizar un tipo de maquinaria
 */
export async function actualizarTipoMaquinaria(id, formData) {
  try {
    const { supabase } = await verificarAdmin()

    const validacion = validate(
      z.object({ nombre: z.string().min(1).trim().optional(), descripcion: z.string().optional().nullable() }).passthrough(),
      formData
    )
    if (!validacion.success) throw new Error(validacion.error)
    const datos = validacion.data

    const { error } = await supabase
      .from('tipos_maquinaria')
      .update(datos)
      .eq('id', id)

    if (error) throw error

    revalidatePath('/configuracion')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

/**
 * Eliminar un tipo de maquinaria
 */
export async function eliminarTipoMaquinaria(id) {
  try {
    const { supabase } = await verificarAdmin()

    const { error } = await supabase
      .from('tipos_maquinaria')
      .delete()
      .eq('id', id)

    if (error) throw error

    revalidatePath('/configuracion')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

// ─── CONFIGURACIÓN DE UMBRALES ─────────────────────────────────

/**
 * Guardar configuración de umbrales de mantenimiento
 */
export async function configurarUmbrales(umbrales) {
  try {
    const { supabase } = await verificarAdmin()

    const validacion = validate(
      z.object({
        email_notifications: z.boolean().optional(),
        email_destino: z.string().email().optional().nullable(),
        alertar_vencidos: z.boolean().optional(),
        alertar_criticos: z.boolean().optional(),
        alertar_proximos: z.boolean().optional(),
        dias_anticipacion: z.coerce.number().int().nonnegative().optional(),
        horometro_maximo: z.coerce.number().nonnegative().optional().nullable(),
        intervalo_cambio_aceite: z.coerce.number().nonnegative().optional(),
        intervalo_cambio_filtros: z.coerce.number().nonnegative().optional(),
      }).passthrough(),
      umbrales
    )
    if (!validacion.success) throw new Error(validacion.error)

    const { error } = await supabase
      .from('configuracion_alertas')
      .upsert({
        id: 1,
        email_notifications: umbrales.email_notifications ?? true,
        email_destino: umbrales.email_destino || null,
        alertar_vencidos: umbrales.alertar_vencidos ?? true,
        alertar_criticos: umbrales.alertar_criticos ?? true,
        alertar_proximos: umbrales.alertar_proximos ?? true,
        dias_anticipacion: umbrales.dias_anticipacion ?? 30,
        horometro_maximo: umbrales.horometro_maximo ?? null,
        intervalo_cambio_aceite: umbrales.intervalo_cambio_aceite ?? 300,
        intervalo_cambio_filtros: umbrales.intervalo_cambio_filtros ?? 120,
      })

    if (error) throw error

    revalidatePath('/configuracion')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}

// ─── ROLES DE USUARIO ─────────────────────────────────────────

/**
 * Cambiar el rol de un usuario
 */
export async function actualizarRolUsuario(userId, nuevoRol) {
  try {
    const { supabase, user } = await verificarAdmin()

    if (userId === user.id) {
      throw new Error('No puedes cambiar tu propio rol')
    }

    const validacion = validate(
      z.string().min(1, 'Rol es requerido'),
      nuevoRol
    )
    if (!validacion.success) throw new Error(validacion.error)

    const { error } = await supabase
      .from('perfiles')
      .update({ rol: validacion.data })
      .eq('id', userId)

    if (error) throw error

    revalidatePath('/configuracion')
    return { success: true }
  } catch (err) {
    return formatearError(err)
  }
}
