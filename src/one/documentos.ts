// TunayWasi ONE — unicidad de documentos de identidad (REG-01 → REG-04)
//
// Índice `one_documentos/{clave}`: un documento por DNI/RUC registrado.
// La unicidad la garantiza firestore.rules: solo se permite CREAR la clave si no existe
// (o re-escribirla si ya pertenece al mismo uid). Nadie salvo admin puede leer el índice,
// así que no es posible consultar si un DNI/RUC está registrado.
//
//   DNI_B2C_<dni>     → buyer_b2c      (REG-01: DNI único por rol)
//   DNI_SELLER_<dni>  → seller         (REG-01)
//   RUC_<ruc>         → buyer_b2b o seller RUC_PROPIO (REG-02: 1 cuenta por RUC)
//   RUC de cooperativa → NO se indexa: lo comparten todos los socios (REG-03 / TRIB-04)
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/shared/firebase'
import type { RolONE } from './types'

const COLECCION = 'one_documentos'

export const claveDniB2C = (dni: string) => `DNI_B2C_${dni}`
export const claveDniSeller = (dni: string) => `DNI_SELLER_${dni}`
export const claveRuc = (ruc: string) => `RUC_${ruc}`

export function esDniValido(dni: string): boolean {
  return /^\d{8}$/.test(dni)
}

/**
 * REG-04 — Formato RUC SUNAT: 11 dígitos, prefijo válido y dígito verificador (módulo 11).
 * @param prefijos 10 = persona natural con negocio · 15/17 = casos especiales · 20 = persona jurídica
 */
export function esRucValido(ruc: string, prefijos: readonly string[] = ['10', '15', '17', '20']): boolean {
  if (!/^\d{11}$/.test(ruc)) return false
  if (!prefijos.includes(ruc.slice(0, 2))) return false
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const suma = pesos.reduce((acc, p, i) => acc + p * Number(ruc[i]), 0)
  let dv = 11 - (suma % 11)
  if (dv === 10) dv = 0
  if (dv === 11) dv = 1
  return dv === Number(ruc[10])
}

/** Mensaje de error de formato de RUC, o null si es válido. */
export function errorFormatoRuc(ruc: string, prefijos: readonly string[] = ['10', '15', '17', '20']): string | null {
  if (!/^\d{11}$/.test(ruc)) return 'El RUC debe tener 11 dígitos.'
  if (!prefijos.includes(ruc.slice(0, 2))) return `El RUC debe empezar con ${prefijos.join(', ')}.`
  if (!esRucValido(ruc, prefijos)) return 'El RUC no es válido — revisa el número (dígito verificador incorrecto).'
  return null
}

export class DocumentoDuplicadoError extends Error {
  readonly code = 'documento-duplicado'
  constructor(readonly tipo: 'DNI' | 'RUC') {
    super(tipo === 'DNI'
      ? 'Este DNI ya está registrado en TunayWasi para este tipo de cuenta. Si es tuyo, inicia sesión o escríbenos a tunaywasi@gmail.com.'
      : 'Este RUC ya está registrado en TunayWasi. Si pertenece a tu empresa, inicia sesión o escríbenos a tunaywasi@gmail.com.')
  }
}

export function esDocumentoDuplicado(e: unknown): e is DocumentoDuplicadoError {
  return e instanceof DocumentoDuplicadoError
}

/**
 * Reserva las claves para `uid`. Si alguna ya pertenece a otro usuario, revierte las
 * reservadas en esta llamada y lanza DocumentoDuplicadoError.
 * Requiere que el usuario esté autenticado como `uid`.
 */
export async function reservarDocumentos(uid: string, rol: RolONE, claves: string[]): Promise<void> {
  const creadas: string[] = []
  for (const clave of claves) {
    const tipo = clave.startsWith('RUC_') ? 'RUC' : 'DNI'
    try {
      await setDoc(doc(db, COLECCION, clave), { uid, rol, tipo, createdAt: serverTimestamp() })
      creadas.push(clave)
    } catch (e: unknown) {
      await liberarDocumentos(creadas)
      // Las reglas rechazan la escritura si la clave existe y es de otro uid
      if ((e as { code?: string })?.code === 'permission-denied') throw new DocumentoDuplicadoError(tipo)
      throw e
    }
  }
}

/** Libera claves reservadas por el usuario actual (rollback). Nunca lanza. */
export async function liberarDocumentos(claves: string[]): Promise<void> {
  await Promise.all(claves.map(c => deleteDoc(doc(db, COLECCION, c)).catch(() => {})))
}
