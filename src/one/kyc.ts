// Validación de caficultores (F-03): historial de revisiones y decisión manual del admin.
// El job nocturno (scripts/kyc) escribe en la misma colección; sus códigos se traducen aquí.
import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch, type Firestore, type Timestamp } from 'firebase/firestore'
import type { UsuarioONE } from './types'

export type ResultadoKyc = 'APROBADO' | 'RECHAZADO' | 'PENDIENTE'
export type EstadoPaso = 'CUMPLE' | 'NO_CUMPLE' | 'PENDIENTE' | 'NO_APLICA' | 'NO_EVALUADO' | 'OMITIDO'
export interface PasoKyc { id: string; estado: EstadoPaso; motivos: string[] }

export interface RevisionKyc {
  id: string
  uid: string
  nombre: string
  origen: 'JOB' | 'ADMIN'
  resultado: ResultadoKyc
  pasos: PasoKyc[]
  criteriosPendientes: string[]
  similitud?: number | null
  rostroOmitido?: boolean
  mensaje?: string
  adminEmail?: string
  fecha: Timestamp | null
}

export const MENSAJE_MINIMO = 10

export const NOMBRE_PASO: Record<string, string> = {
  DATOS: 'Datos completos', DNI: 'DNI', RUC: 'RUC en SUNAT', COBRO: 'Cuenta de cobro',
  FOTOS: 'Fotos', IDENTIDAD: 'Rostro y documento',
}

export const TEXTO_MOTIVO: Record<string, string> = {
  DATOS_INCOMPLETOS: 'Falta nombre, región o distrito',
  MODALIDAD_AUSENTE: 'No eligió modalidad tributaria',
  DNI_INVALIDO: 'El DNI no tiene 8 dígitos',
  DNI_SIN_RESERVA: 'El DNI no está reservado a nombre de esta cuenta',
  DNI_REPETIDO: 'El DNI figura en otra cuenta',
  RUC_INVALIDO: 'El RUC no es válido',
  RUC_NO_CORRESPONDE_AL_DNI: 'El RUC 10 no corresponde al DNI',
  RUC_SIN_RESERVA: 'El RUC no está reservado a nombre de esta cuenta',
  SIN_PADRON_SUNAT: 'No se pudo consultar el padrón de SUNAT (se reintenta)',
  RUC_NO_FIGURA_EN_SUNAT: 'El RUC no figura en SUNAT',
  RUC_NO_ACTIVO: 'El RUC no está ACTIVO',
  RUC_NO_HABIDO: 'El RUC no está HABIDO',
  NOMBRE_NO_COINCIDE_CON_SUNAT: 'El nombre no coincide con SUNAT',
  CCI_INVALIDO: 'El CCI no tiene 20 dígitos',
  CCI_REPETIDO: 'El CCI figura en otra cuenta',
  YAPE_INVALIDO: 'El número Yape no es un celular válido',
  YAPE_REPETIDO: 'El número Yape figura en otra cuenta',
  COOPERATIVA_REVISION_MANUAL: 'Cooperativa: confirmar que es socio y que la cooperativa autoriza pagarle a su cuenta',
  FOTOS_AUSENTES: 'Falta la foto del DNI o la selfie',
  FOTO_USADA_EN_OTRA_CUENTA: 'Una foto ya se usa en otra cuenta',
  FOTO_ORIGEN_NO_PERMITIDO: 'La foto no está en la cuenta de Cloudinary configurada: revisar',
  FOTO_NO_DISPONIBLE: 'No se pudo descargar la foto (se reintenta)',
  FOTO_DEMASIADO_GRANDE: 'La foto pesa más de 5 MB: revisar a mano',
  FOTO_FORMATO_NO_SOPORTADO: 'Formato distinto de JPG o PNG: revisar a mano',
  SELFIE_IGUAL_A_FOTO_DNI: 'La selfie es la misma imagen que el DNI',
  ROSTRO_NO_COINCIDE: 'El rostro de la selfie no coincide con el del DNI',
  ROSTRO_NO_DETECTADO: 'No se detectó un rostro',
  SELFIE_SIN_DNI: 'En la selfie no se ve el DNI',
  DNI_NO_COINCIDE_CON_FOTO: 'El número de DNI no se lee igual en la foto',
  NOMBRE_NO_COINCIDE_CON_DNI: 'El nombre no coincide con el del DNI',
  SIN_VERIFICACION_FACIAL: 'La comparación de rostros no está configurada',
  ERROR_ANALISIS_FOTOS: 'Falló el análisis de las fotos (se reintenta)',
}

/** Solo se puede aprobar sin mensaje si la última revisión tiene todos los criterios cumplidos. */
export function requiereMensaje(resultado: 'APROBADO' | 'RECHAZADO', base?: RevisionKyc): boolean {
  return resultado === 'RECHAZADO' || !base || base.criteriosPendientes.length > 0
}

export async function cargarKyc(db: Firestore): Promise<{ revisiones: RevisionKyc[]; caficultores: UsuarioONE[] }> {
  const [rev, caf] = await Promise.all([
    getDocs(collection(db, 'one_kyc_revisiones')),
    getDocs(query(collection(db, 'one_usuarios'), where('rol', '==', 'seller'))),
  ])
  const revisiones = rev.docs
    .map(d => ({ id: d.id, ...d.data() }) as RevisionKyc)
    .sort((a, b) => (b.fecha?.toMillis() ?? 0) - (a.fecha?.toMillis() ?? 0))
  return { revisiones, caficultores: caf.docs.map(d => ({ ...d.data(), uid: d.id }) as UsuarioONE) }
}

/** Decisión del admin: cambia el estado y deja el registro de auditoría en la misma operación. */
export async function resolverKyc(db: Firestore, args: {
  caficultor: Pick<UsuarioONE, 'uid' | 'nombre'>
  resultado: 'APROBADO' | 'RECHAZADO'
  mensaje: string
  admin: { uid: string; email: string }
  base?: RevisionKyc
}): Promise<void> {
  const { caficultor, resultado, admin, base } = args
  const mensaje = args.mensaje.trim()
  if (requiereMensaje(resultado, base) && mensaje.length < MENSAJE_MINIMO) {
    throw new Error(`Escribe el motivo (mínimo ${MENSAJE_MINIMO} caracteres).`)
  }
  const revision = doc(collection(db, 'one_kyc_revisiones'))
  const lote = writeBatch(db)
  lote.set(revision, {
    uid: caficultor.uid,
    nombre: caficultor.nombre ?? '',
    origen: 'ADMIN',
    resultado,
    pasos: base?.pasos ?? [],
    // Sin revisión previa no hay nada comprobado
    criteriosPendientes: base ? base.criteriosPendientes : ['SIN_REVISION_AUTOMATICA'],
    mensaje,
    adminUid: admin.uid,
    adminEmail: admin.email,
    fecha: serverTimestamp(),
  })
  lote.update(doc(db, 'one_usuarios', caficultor.uid), {
    estadoKyc: resultado === 'APROBADO' ? 'ACTIVO' : 'RECHAZADO',
    'caficultor.activo': resultado === 'APROBADO',
    kycRevisionId: revision.id,
    updatedAt: serverTimestamp(),
  })
  await lote.commit()
}
