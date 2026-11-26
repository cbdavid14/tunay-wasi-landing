// TunayWasi ONE — operaciones Firestore
// Noviembre 2026 — alineado al esquema Android
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  runTransaction,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../shared/firebase'
import { ONE_COLLECTIONS, ONE_CONFIG } from './config'
import type {
  CaficultorONE,
  ProductoONE,
  PedidoONE,
  UsuarioONE,
  DireccionEnvioONE,
  KitIdentidadONE,
  CalificacionCaficultor,
  CalificacionCafeteria,
  CreatePedidoInput,
  CreateUsuarioInput,
  CreateCalificacionCaficultorInput,
  CreateCalificacionCafeteriaInput,
  MenuONE,
  CreateMenuInput,
  FormatoONE,
  MensajePedidoONE,
  SendMensajeInput,
  UbigeoONE,
  LogisticaCaficultorONE,
  SaveLogisticaInput,
  SolicitudB2B,
  EmpresaB2B,
  CotizacionONE,
  CreateCotizacionInput,
  ResponderCotizacionInput,
  PagoCaficultorONE,
  EvidenciaONE,
  AprobarEvidenciaInput,
  RechazarEvidenciaInput,
  ReclamoONE,
  CreateReclamoInput,
  CreateReposicionInput,
} from './types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomDigits(n: number): string {
  return Math.floor(Math.random() * Math.pow(10, n))
    .toString()
    .padStart(n, '0')
}

function generarIdPedido(): string {
  const year = ONE_CONFIG.PEDIDO_YEAR
  return `${ONE_CONFIG.PEDIDO_PREFIX}-${year}-${randomDigits(4)}`
}

function calcularSubtotalCents(
  unitCents: number,
  qty: number
): number {
  return unitCents * qty
}

// Convierte Timestamp de Firestore a string ISO o devuelve el string tal cual
function normalizeDate(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (typeof value === 'string') return value
  return new Date().toISOString()
}

// Convierte presentación a kg equivalente para cálculo de stock
function parseKgFromPresentacion(presentacion: FormatoONE, qty: number): number {
  switch (presentacion) {
    case '250g':     return 0.25 * qty
    case '500g':     return 0.5  * qty
    case '1kg':      return 1.0  * qty
    case '5kg':      return 5.0  * qty
    case '10kg':     return 10.0 * qty
    case '20kg':     return 20.0 * qty
    case '1quintal': return 46.0 * qty
    case '1saco':    return 60.0 * qty
    default:         return 0
  }
}

// ─── CATÁLOGO ─────────────────────────────────────────────────────────────────
// Los caficultores ahora viven en one_usuarios con rol='seller'
// CaficultorONE se construye desde el sub-documento caficultor del usuario

function usuarioToCaficultor(snap: { id: string; data: () => any }): CaficultorONE {
  const data = snap.data()
  const c = data.caficultor ?? {}
  return {
    id: snap.id,
    nombre: data.nombre ?? '',
    foto: c.foto ?? data.foto ?? '',
    region: c.region ?? '',
    distrito: c.distrito ?? '',
    altitudMsnm: c.altitudMsnm ?? 0,
    historia: c.historia ?? '',
    coordenadas: c.coordenadas,
    activo: c.activo ?? true,
    createdAt: normalizeDate(data.createdAt),
    scoreConfianza: c.scoreConfianza,
    totalCalificaciones: c.totalCalificaciones,
  }
}

export async function fetchCaficultores(): Promise<CaficultorONE[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.USUARIOS),
      where('rol', '==', 'seller')
    )
  )
  return snap.docs
    .map((d) => usuarioToCaficultor({ id: d.id, data: d.data.bind(d) }))
    .filter((c) => c.activo)
}

export async function fetchCaficultor(id: string): Promise<CaficultorONE> {
  const snap = await getDoc(doc(db, ONE_COLLECTIONS.USUARIOS, id))
  if (!snap.exists()) throw new Error(`Caficultor ${id} no encontrado`)
  return usuarioToCaficultor({ id: snap.id, data: snap.data.bind(snap) })
}

export async function fetchProductos(): Promise<ProductoONE[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.PRODUCTOS),
      where('status', '==', 'activo')
    )
  )
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      createdAt: normalizeDate(data.createdAt),
      updatedAt: normalizeDate(data.updatedAt),
    } as ProductoONE
  })
}

export async function fetchProducto(id: string): Promise<ProductoONE> {
  const snap = await getDoc(doc(db, ONE_COLLECTIONS.PRODUCTOS, id))
  if (!snap.exists()) throw new Error(`Producto ${id} no encontrado`)
  const data = snap.data()
  return {
    id: snap.id,
    ...data,
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
  } as ProductoONE
}

// ─── PEDIDOS ─────────────────────────────────────────────────────────────────

export async function createPedido(input: CreatePedidoInput): Promise<string> {
  const pedidoId = generarIdPedido()

  // Calcular items con subtotales — omitir menuId si es undefined
  const items = input.items.map((item) => ({
    productoId: item.productoId,
    productoNombre: item.productoNombre,
    caficultorId: item.caficultorId,
    caficultorNombre: item.caficultorNombre,
    presentacion: item.presentacion,
    qty: item.qty,
    unitCents: item.unitCents,
    subtotalCents: calcularSubtotalCents(item.unitCents, item.qty),
    ...(item.menuId ? { menuId: item.menuId } : {}),
  }))

  const subtotalCents = items.reduce((acc, item) => acc + item.subtotalCents, 0)
  const deliveryCents = input.deliveryCentsOverride ?? ONE_CONFIG.DELIVERY_CENTS
  const totalCents = subtotalCents + deliveryCents

  // Construir pedido omitiendo campos undefined
  const pedido = {
    negocioId: input.negocioId,
    negocioNombre: input.negocioNombre,
    negocioEmail: input.negocioEmail,
    negocioTelefono: input.negocioTelefono,
    ...(input.negocioRazonSocial ? { negocioRazonSocial: input.negocioRazonSocial } : {}),
    ...(input.negocioRuc ? { negocioRuc: input.negocioRuc } : {}),
    nombreLocal: input.nombreLocal,
    distritoLocal: input.distritoLocal,
    items,
    subtotalCents,
    deliveryCents,
    totalCents,
    metodoPago: input.metodoPago,
    pagoStatus: 'pendiente' as const,
    logisticaStatus: 'preparando' as const,
    kitGenerado: false,
    calificado: false,
    recepcionConfirmada: false,
    esKitProveedor: input.esKitProveedor ?? false,
    ...(input.caficultorId ? { caficultorId: input.caficultorId } : {}),
    ...(input.grupoCheckoutId ? { grupoCheckoutId: input.grupoCheckoutId } : {}),
    ...(input.subPedidoLetra ? { subPedidoLetra: input.subPedidoLetra } : {}),
    ...(input.direccionEntrega ? { direccionEntrega: input.direccionEntrega } : {}),
    ...(input.envioDetalle ? { envioDetalle: input.envioDetalle } : {}),
    isReposicion: input.isReposicion ?? false,
    ...(input.reposicionIds?.length ? { reposicionIds: input.reposicionIds } : {}),
    // ORD-02: expiresAt = 24h para B2C (comprador tiene 24h para subir voucher)
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // Usar transacción para reservar kg de cada producto y guardar el pedido
  await runTransaction(db, async (tx) => {
    // ── FASE 1: todas las lecturas ──────────────────────────────────────────
    const prodRefs = items.map(item => doc(db, ONE_COLLECTIONS.PRODUCTOS, item.productoId))
    const prodSnaps = await Promise.all(prodRefs.map(ref => tx.get(ref)))

    const negocioRef = doc(db, ONE_COLLECTIONS.USUARIOS, input.negocioId)
    const negocioSnap = await tx.get(negocioRef)

    // ── FASE 2: validaciones ────────────────────────────────────────────────
    for (let i = 0; i < items.length; i++) {
      const snap = prodSnaps[i]
      const item = items[i]
      if (!snap.exists()) throw new Error(`Producto ${item.productoId} no existe`)
      const prod = snap.data() as ProductoONE
      const kgSolicitados = parseKgFromPresentacion(item.presentacion as FormatoONE, item.qty)
      const disponibles = prod.kgDisponibles - prod.kgReservados
      if (disponibles < kgSolicitados) throw new Error(`Stock insuficiente para ${item.productoNombre}`)
    }

    // ── FASE 3: todas las escrituras ────────────────────────────────────────
    for (let i = 0; i < items.length; i++) {
      const snap = prodSnaps[i]
      const item = items[i]
      const prod = snap.data() as ProductoONE
      const kgSolicitados = parseKgFromPresentacion(item.presentacion as FormatoONE, item.qty)
      tx.update(prodRefs[i], {
        kgReservados: prod.kgReservados + kgSolicitados,
        updatedAt: serverTimestamp(),
      })
    }

    const pedidoRef = doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId)
    tx.set(pedidoRef, { ...pedido, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })

    if (negocioSnap.exists()) {
      const negocioData = negocioSnap.data() as UsuarioONE
      const pedidoIds = negocioData.negocio?.pedidoIds ?? []
      tx.update(negocioRef, { 'negocio.pedidoIds': [...pedidoIds, pedidoId] })
    }
  })

  return pedidoId
}

export async function createReposicion(input: CreateReposicionInput): Promise<string> {
  const nextOrderDate = new Date()
  nextOrderDate.setDate(nextOrderDate.getDate() + input.frecuenciaDias)
  const docRef = await addDoc(collection(db, ONE_COLLECTIONS.REPOSICIONES), {
    status: 'ACTIVE',
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    productoId: input.productoId,
    productoNombre: input.productoNombre,
    pedidoOrigenId: input.pedidoOrigenId,
    frecuenciaDias: input.frecuenciaDias,
    cantidadUnidades: input.cantidadUnidades,
    presentacion: input.presentacion,
    nextOrderDate: nextOrderDate.toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function linkReposicionesToPedido(pedidoId: string, reposicionIds: string[]): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId), {
    reposicionIds,
    updatedAt: serverTimestamp(),
  })
}

export async function fetchPedido(id: string): Promise<PedidoONE> {
  const snap = await getDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, id))
  if (!snap.exists()) throw new Error(`Pedido ${id} no encontrado`)
  const data = snap.data()
  return {
    id: snap.id,
    ...data,
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
  } as PedidoONE
}

export async function fetchPedidosByNegocio(uid: string): Promise<PedidoONE[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.PEDIDOS),
      where('negocioId', '==', uid),
    )
  )
  return snap.docs
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        createdAt: normalizeDate(data.createdAt),
        updatedAt: normalizeDate(data.updatedAt),
      } as PedidoONE
    })
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

export async function fetchPedidosByCaficultor(caficultorId: string): Promise<PedidoONE[]> {
  // Intentar primero query por caficultorId en raíz (modelo nuevo — más eficiente)
  const snapNuevo = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.PEDIDOS),
      where('caficultorId', '==', caficultorId),
      orderBy('createdAt', 'desc')
    )
  )
  const pedidosNuevos = snapNuevo.docs.map((d) => {
    const data = d.data()
    return { id: d.id, ...data, createdAt: normalizeDate(data.createdAt), updatedAt: normalizeDate(data.updatedAt) } as PedidoONE
  })

  // Fallback: pedidos legacy donde el caficultor aparece en items[].caficultorId (sin caficultorId en raíz)
  const snapAll = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.PEDIDOS),
      orderBy('createdAt', 'desc')
    )
  )
  const idsNuevos = new Set(pedidosNuevos.map(p => p.id))
  const pedidosLegacy = snapAll.docs
    .map((d) => {
      const data = d.data()
      return { id: d.id, ...data, createdAt: normalizeDate(data.createdAt), updatedAt: normalizeDate(data.updatedAt) } as PedidoONE
    })
    .filter((p) => !idsNuevos.has(p.id) && !p.caficultorId && p.items.some((item) => item.caficultorId === caficultorId))

  return [...pedidosNuevos, ...pedidosLegacy].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

export async function fetchPedidosAdmin(): Promise<PedidoONE[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.PEDIDOS),
      orderBy('createdAt', 'desc')
    )
  )
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      createdAt: normalizeDate(data.createdAt),
      updatedAt: normalizeDate(data.updatedAt),
    } as PedidoONE
  })
}

export async function subirVoucher(pedidoId: string, url: string): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId), {
    voucherUrl: url,
    pagoStatus: 'voucher_subido',
    updatedAt: serverTimestamp(),
  })
}

// Obtener todos los pedidos de un grupo de checkout
export async function fetchPedidosByGrupo(grupoCheckoutId: string): Promise<PedidoONE[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.PEDIDOS),
      where('grupoCheckoutId', '==', grupoCheckoutId)
    )
  )
  return snap.docs
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        ...data,
        createdAt: normalizeDate(data.createdAt),
        updatedAt: normalizeDate(data.updatedAt),
      } as PedidoONE
    })
    .sort((a, b) => (a.subPedidoLetra ?? '').localeCompare(b.subPedidoLetra ?? ''))
}

// Subir voucher a todos los pedidos de un grupo (el comprobante cubre todos los sub-pedidos)
export async function subirVoucherGrupo(grupoCheckoutId: string, url: string): Promise<void> {
  const pedidos = await fetchPedidosByGrupo(grupoCheckoutId)
  await Promise.all(
    pedidos.map((p) =>
      updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, p.id), {
        voucherUrl: url,
        pagoStatus: 'voucher_subido',
        updatedAt: serverTimestamp(),
      })
    )
  )
}

export async function verificarPago(pedidoId: string): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId), {
    pagoStatus: 'verificado',
    updatedAt: serverTimestamp(),
  })
}

export async function verificarPagoGrupo(grupoCheckoutId: string): Promise<void> {
  const pedidos = await fetchPedidosByGrupo(grupoCheckoutId)
  await Promise.all(pedidos.map(p => updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, p.id), {
    pagoStatus: 'verificado',
    updatedAt: serverTimestamp(),
  })))
}

export async function rechazarPago(pedidoId: string): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId), {
    pagoStatus: 'rechazado',
    updatedAt: serverTimestamp(),
  })
}

export async function rechazarPagoGrupo(grupoCheckoutId: string): Promise<void> {
  const pedidos = await fetchPedidosByGrupo(grupoCheckoutId)
  await Promise.all(pedidos.map(p => updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, p.id), {
    pagoStatus: 'rechazado',
    updatedAt: serverTimestamp(),
  })))
}

export async function updateLogistica(
  pedidoId: string,
  status: PedidoONE['logisticaStatus']
): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId), {
    logisticaStatus: status,
    updatedAt: serverTimestamp(),
  })
}

export async function despacharAgencia(
  pedidoId: string,
  data: { codigoAgencia: string; fotoDespacho?: string; caficultorId?: string; agencia?: string }
): Promise<void> {
  const base = {
    logisticaStatus: 'en_agencia',
    codigoAgencia: data.codigoAgencia,
    ...(data.fotoDespacho ? { fotoDespacho: data.fotoDespacho } : {}),
    updatedAt: serverTimestamp(),
  }
  if (data.caficultorId) {
    const key = `enviosCaficultor.${data.caficultorId}`
    await updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId), {
      ...base,
      [key]: {
        codigoAgencia: data.codigoAgencia,
        ...(data.agencia ? { agencia: data.agencia } : {}),
        ...(data.fotoDespacho ? { fotoDespacho: data.fotoDespacho } : {}),
        logisticaStatus: 'en_agencia',
      },
    })
  } else {
    await updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId), base)
  }
}

export async function confirmarRecepcion(pedidoId: string, enviosCaficultorIds?: string[]): Promise<void> {
  const updates: Record<string, unknown> = {
    logisticaStatus: 'entregado',
    recepcionConfirmada: true,
    updatedAt: serverTimestamp(),
  }
  for (const cafId of (enviosCaficultorIds ?? [])) {
    updates[`enviosCaficultor.${cafId}.logisticaStatus`] = 'entregado'
  }
  await updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId), updates)
}

export async function confirmarRecepcionCaficultor(
  pedidoId: string,
  caficultorId: string,
  todosEntregados: boolean
): Promise<void> {
  const updates: Record<string, unknown> = {
    [`enviosCaficultor.${caficultorId}.logisticaStatus`]: 'entregado',
    updatedAt: serverTimestamp(),
  }
  if (todosEntregados) {
    updates.logisticaStatus = 'entregado'
    updates.recepcionConfirmada = true
  }
  await updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId), updates)
}

export async function marcarEnDisputa(pedidoId: string, reclamoId?: string): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId), {
    logisticaStatus: 'en_disputa',
    ...(reclamoId ? { disputaId: reclamoId } : {}),
    updatedAt: serverTimestamp(),
  })
}

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

export async function fetchNegocios(): Promise<UsuarioONE[]> {
  const snap = await getDocs(
    query(collection(db, ONE_COLLECTIONS.USUARIOS), where('rol', 'in', ['buyer_b2b', 'buyer_b2c']))
  )
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UsuarioONE))
}

export async function fetchNegocio(uid: string): Promise<UsuarioONE | null> {
  const snap = await getDoc(doc(db, ONE_COLLECTIONS.USUARIOS, uid))
  if (!snap.exists()) return null
  return { uid: snap.id, ...snap.data() } as UsuarioONE
}

export async function fetchMenuNegocio(negocioId: string): Promise<ProductoONE[]> {
  const pedidosSnap = await getDocs(
    query(collection(db, ONE_COLLECTIONS.PEDIDOS), where('negocioId', '==', negocioId))
  )
  const productoIds = new Set(
    pedidosSnap.docs.flatMap(d => (d.data().items as { productoId: string }[]).map(i => i.productoId))
  )
  if (productoIds.size === 0) return []
  const productos: ProductoONE[] = []
  for (const id of productoIds) {
    const snap = await getDoc(doc(db, ONE_COLLECTIONS.PRODUCTOS, id))
    if (snap.exists()) {
      const data = snap.data()
      productos.push({ id: snap.id, ...data, createdAt: normalizeDate(data.createdAt), updatedAt: normalizeDate(data.updatedAt) } as ProductoONE)
    }
  }
  return productos
}

export async function updateStock(productoId: string, kgDisponibles: number): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.PRODUCTOS, productoId), {
    kgDisponibles,
    updatedAt: serverTimestamp(),
  })
}

export async function crearProducto(
  data: Omit<ProductoONE, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, ONE_COLLECTIONS.PRODUCTOS), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateProducto(
  productoId: string,
  data: Partial<Omit<ProductoONE, 'id' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.PRODUCTOS, productoId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function crearUsuario(
  uid: string,
  data: CreateUsuarioInput
): Promise<void> {
  await setDoc(doc(db, ONE_COLLECTIONS.USUARIOS, uid), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export async function fetchUsuario(uid: string): Promise<UsuarioONE> {
  const snap = await getDoc(doc(db, ONE_COLLECTIONS.USUARIOS, uid))
  if (!snap.exists()) throw new Error(`Usuario ${uid} no encontrado`)
  return { uid: snap.id, ...snap.data() } as UsuarioONE
}

export async function updateUsuario(
  uid: string,
  data: Partial<UsuarioONE>
): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.USUARIOS, uid), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function updateDireccionesNegocio(
  uid: string,
  direcciones: DireccionEnvioONE[]
): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.USUARIOS, uid), {
    'negocio.direcciones': direcciones,
    updatedAt: serverTimestamp(),
  })
}

export async function updateCaficultor(
  caficultorId: string,
  data: Partial<UsuarioONE['caficultor']>
): Promise<void> {
  // Los datos del caficultor ahora viven en one_usuarios sub-doc caficultor
  const updates: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data ?? {})) {
    updates[`caficultor.${key}`] = value
  }
  await updateDoc(doc(db, ONE_COLLECTIONS.USUARIOS, caficultorId), updates)
}

// ─── KITS ─────────────────────────────────────────────────────────────────────

const PLACEHOLDER_PDF = 'https://res.cloudinary.com/dtc9meqbc/image/upload/v1/tunaywasi/placeholder-kit.pdf'

export async function generarKit(
  pedidoId: string,
  nombreLocal: string,
  negocioId: string,
  productos: KitIdentidadONE['productos'],
  caficultorId?: string
): Promise<string> {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const qrUrl = caficultorId ? `${origin}/caficultor/${caficultorId}` : undefined

  const kitData: Omit<KitIdentidadONE, 'id'> = {
    pedidoId,
    negocioId,
    nombreLocal,
    productos,
    menuPdfUrl: PLACEHOLDER_PDF,
    fichasUrl: PLACEHOLDER_PDF,
    qrUrl,
    instagramPackUrl: PLACEHOLDER_PDF,
    createdAt: new Date().toISOString(),
  }

  const docRef = await addDoc(collection(db, ONE_COLLECTIONS.KITS), {
    ...kitData,
    createdAt: serverTimestamp(),
  })

  await updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId), {
    kitGenerado: true,
    kitId: docRef.id,
    updatedAt: serverTimestamp(),
  })

  return docRef.id
}

export async function fetchKit(kitId: string): Promise<KitIdentidadONE> {
  const snap = await getDoc(doc(db, ONE_COLLECTIONS.KITS, kitId))
  if (!snap.exists()) throw new Error(`Kit ${kitId} no encontrado`)
  const data = snap.data()
  return {
    id: snap.id,
    ...data,
    createdAt: normalizeDate(data.createdAt),
  } as KitIdentidadONE
}

export async function fetchKitByPedido(
  pedidoId: string
): Promise<KitIdentidadONE | null> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.KITS),
      where('pedidoId', '==', pedidoId)
    )
  )
  if (snap.empty) return null
  const d = snap.docs[0]
  const data = d.data()
  return {
    id: d.id,
    ...data,
    createdAt: normalizeDate(data.createdAt),
  } as KitIdentidadONE
}

export async function actualizarUrlsKit(
  kitId: string,
  urls: Partial<Pick<KitIdentidadONE, 'menuPdfUrl' | 'fichasUrl' | 'qrUrl' | 'instagramPackUrl'>>
): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.KITS, kitId), urls)
}

// ─── SOLICITUD CAFICULTOR (sin auth) ─────────────────────────────────────────

export interface SolicitudCaficultorInput {
  nombre: string
  region: string
  distrito: string
  altitudMsnm: number
  variedadPrincipal: string
  kgDisponibles: number
  email: string
  telefono: string
  fotoUrl?: string
}

export async function enviarSolicitudCaficultor(
  data: SolicitudCaficultorInput
): Promise<string> {
  const docRef = await addDoc(collection(db, 'one_solicitudes_caficultor'), {
    ...data,
    activo: false,
    solicitudPendiente: true,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

// ─── CALIFICACIONES ──────────────────────────────────────────────────────────

export async function crearCalificacionCaficultor(
  input: CreateCalificacionCaficultorInput
): Promise<string> {
  const docRef = await addDoc(collection(db, ONE_COLLECTIONS.CALIFICACIONES_CAFICULTOR), {
    ...input,
    createdAt: serverTimestamp(),
  })

  await updateDoc(doc(db, ONE_COLLECTIONS.PEDIDOS, input.pedidoId), {
    calificado: true,
    calificacionId: docRef.id,
    updatedAt: serverTimestamp(),
  })

  await recalcularScoreCaficultor(input.caficultorId)

  return docRef.id
}

async function recalcularScoreCaficultor(caficultorId: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.CALIFICACIONES_CAFICULTOR),
      where('caficultorId', '==', caficultorId)
    )
  )
  if (snap.empty) return
  const total = snap.docs.reduce((acc, d) => acc + (d.data().estrellas as number), 0)
  const promedio = Math.round((total / snap.docs.length) * 10) / 10
  // Actualizar score en sub-doc caficultor del usuario
  await updateDoc(doc(db, ONE_COLLECTIONS.USUARIOS, caficultorId), {
    'caficultor.scoreConfianza': promedio,
    'caficultor.totalCalificaciones': snap.docs.length,
  })
}

export async function fetchCalificacionesByCaficultor(
  caficultorId: string
): Promise<CalificacionCaficultor[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.CALIFICACIONES_CAFICULTOR),
      where('caficultorId', '==', caficultorId),
    )
  )
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data(), createdAt: normalizeDate(d.data().createdAt) } as CalificacionCaficultor))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

export async function crearCalificacionCafeteria(
  input: CreateCalificacionCafeteriaInput
): Promise<string> {
  const docRef = await addDoc(collection(db, ONE_COLLECTIONS.CALIFICACIONES_CAFETERIA), {
    ...input,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function fetchCalificacionesCafeteria(
  caficultorId: string
): Promise<CalificacionCafeteria[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.CALIFICACIONES_CAFETERIA),
      where('caficultorId', '==', caficultorId),
    )
  )
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data(), createdAt: normalizeDate(d.data().createdAt) } as CalificacionCafeteria))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

// ─── Menús ────────────────────────────────────────────────────────────────────

export async function fetchMenuActivo(negocioId: string): Promise<MenuONE | null> {
  const menus = await fetchMenusByNegocio(negocioId)
  return menus.find((m) => m.activo) ?? null
}

export async function fetchMenusByNegocio(negocioId: string): Promise<MenuONE[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.MENUS),
      where('negocioId', '==', negocioId),
    )
  )
  return snap.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: normalizeDate(d.data().createdAt),
      updatedAt: normalizeDate(d.data().updatedAt),
    } as MenuONE))
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
}

export async function createMenu(input: CreateMenuInput): Promise<string> {
  const qrUrl = `${window.location.origin}/negocio/${input.negocioId}?menu=`
  const docRef = await addDoc(collection(db, ONE_COLLECTIONS.MENUS), {
    negocioId: input.negocioId,
    nombre: input.nombre,
    descripcion: input.descripcion ?? null,
    cafesIds: input.cafesIds,
    activo: false,
    qrUrl: qrUrl + 'PLACEHOLDER',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await updateDoc(docRef, { qrUrl: qrUrl + docRef.id })
  return docRef.id
}

export async function updateMenu(
  menuId: string,
  data: Partial<Omit<MenuONE, 'id' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.MENUS, menuId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteMenu(menuId: string): Promise<void> {
  await deleteDoc(doc(db, ONE_COLLECTIONS.MENUS, menuId))
}

export async function setMenuActivo(negocioId: string, menuId: string): Promise<void> {
  const menus = await fetchMenusByNegocio(negocioId)
  await Promise.all(
    menus.map((m) =>
      updateDoc(doc(db, ONE_COLLECTIONS.MENUS, m.id), {
        activo: m.id === menuId,
        updatedAt: serverTimestamp(),
      })
    )
  )
}

// ─── CHAT / MENSAJES ─────────────────────────────────────────────────────────

export async function sendMensaje(input: SendMensajeInput): Promise<string> {
  const docRef = await addDoc(collection(db, ONE_COLLECTIONS.MENSAJES), {
    pedidoId: input.pedidoId,
    ...(input.caficultorId ? { caficultorId: input.caficultorId } : {}),
    autorId: input.autorId,
    autorNombre: input.autorNombre,
    autorRol: input.autorRol,
    texto: input.texto,
    ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    tipo: input.tipo ?? (input.imageUrl ? 'imagen' : 'texto'),
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function fetchMensajesByPedido(pedidoId: string, caficultorId?: string): Promise<MensajePedidoONE[]> {
  const constraints = [where('pedidoId', '==', pedidoId)]
  if (caficultorId) constraints.push(where('caficultorId', '==', caficultorId))
  const snap = await getDocs(query(collection(db, ONE_COLLECTIONS.MENSAJES), ...constraints))
  return snap.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: normalizeDate(d.data().createdAt),
    } as MensajePedidoONE))
    .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
}

// ─── LOGÍSTICA CAFICULTOR ────────────────────────────────────────────────────

export async function fetchUbigeos(): Promise<UbigeoONE[]> {
  const snap = await getDocs(collection(db, ONE_COLLECTIONS.UBIGEOS))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as UbigeoONE))
}

export async function fetchLogisticaCaficultor(caficultorId: string): Promise<LogisticaCaficultorONE | null> {
  const snap = await getDoc(doc(db, ONE_COLLECTIONS.USUARIOS, caficultorId))
  if (!snap.exists()) return null
  const data = snap.data()
  // Soporte para estructura nueva (caficultor.logistica) y legacy (caficultor.direccion)
  const logistica = data?.caficultor?.logistica ?? data?.caficultor?.direccion ?? null
  if (!logistica?.ubigeo) return null
  // Merge con campos sueltos en caficultor raíz (legacy: campos guardados antes de la estructura logistica)
  const caf = data?.caficultor ?? {}
  return {
    ...(caf.tarifaFijaAgenciaSoles !== undefined && { tarifaFijaAgenciaSoles: caf.tarifaFijaAgenciaSoles }),
    ...(caf.tarifaFijaDomicilioSoles !== undefined && { tarifaFijaDomicilioSoles: caf.tarifaFijaDomicilioSoles }),
    ...logistica,  // logistica gana sobre legacy si tiene el campo
  } as LogisticaCaficultorONE
}

export async function saveLogisticaCaficultor(input: SaveLogisticaInput): Promise<void> {
  const origenTexto = `${input.distrito}, ${input.provincia}, ${input.departamento}`
  await updateDoc(doc(db, ONE_COLLECTIONS.USUARIOS, input.caficultorId), {
    'caficultor.logistica': {
      ubigeo: input.ubigeo,
      departamento: input.departamento,
      provincia: input.provincia,
      distrito: input.distrito,
      origenTexto,
      agencias: input.agencias,
      agenciasMap: input.agenciasMap,
      agenciasActivas: input.agenciasActivas,
      agenciasPermiteDomicilio: input.agenciasPermiteDomicilio,
      ...(input.agenciasDetalle && { agenciasDetalle: input.agenciasDetalle }),
      ...(input.gratisAgenciaActivo !== undefined && { gratisAgenciaActivo: input.gratisAgenciaActivo }),
      ...(input.gratisAgenciaKg !== undefined && { gratisAgenciaKg: input.gratisAgenciaKg }),
      ...(input.gratisDomicilioActivo !== undefined && { gratisDomicilioActivo: input.gratisDomicilioActivo }),
      ...(input.gratisDomicilioKg !== undefined && { gratisDomicilioKg: input.gratisDomicilioKg }),
      ...(input.tarifaFijaAgenciaSoles !== undefined && { tarifaFijaAgenciaSoles: input.tarifaFijaAgenciaSoles }),
      ...(input.tarifaFijaDomicilioSoles !== undefined && { tarifaFijaDomicilioSoles: input.tarifaFijaDomicilioSoles }),
    },
  })
}

// ─── CUENTAS B2B ─────────────────────────────────────────────────────────────

export async function registrarEmpresaB2B(uid: string, empresa: EmpresaB2B): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.USUARIOS, uid), {
    empresa: { ...empresa, solicitudAt: new Date().toISOString() },
  })
}

export async function fetchSolicitudesB2B(estado?: EmpresaB2B['estadoAprobacion']): Promise<SolicitudB2B[]> {
  const q = estado
    ? query(collection(db, ONE_COLLECTIONS.USUARIOS), where('empresa.estadoAprobacion', '==', estado))
    : query(collection(db, ONE_COLLECTIONS.USUARIOS), where('empresa', '!=', null))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => {
      const data = d.data()
      if (!data.empresa) return null
      return {
        uid: d.id,
        nombre: data.nombre ?? '',
        email: data.email ?? '',
        telefono: data.telefono,
        empresa: data.empresa as EmpresaB2B,
        createdAt: normalizeDate(data.createdAt),
      } as SolicitudB2B
    })
    .filter((s): s is SolicitudB2B => s !== null)
}

export async function aprobarSolicitudB2B(uid: string, adminUid: string): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.USUARIOS, uid), {
    'empresa.estadoAprobacion': 'APPROVED',
    'empresa.aprobadoPor': adminUid,
    'empresa.aprobadoAt': new Date().toISOString(),
    'empresa.motivoRechazo': null,
  })
}

export async function rechazarSolicitudB2B(uid: string, adminUid: string, motivo: string): Promise<void> {
  await updateDoc(doc(db, ONE_COLLECTIONS.USUARIOS, uid), {
    'empresa.estadoAprobacion': 'REJECTED',
    'empresa.aprobadoPor': adminUid,
    'empresa.aprobadoAt': new Date().toISOString(),
    'empresa.motivoRechazo': motivo,
  })
}

// ─── COTIZACIONES B2B ─────────────────────────────────────────────────────────

function expiraAt7d(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
}

/** ORD-03: B2B orders expire in 72 h (3 days) after payment window opens */
function expiraAtB2BPedido(): string {
  return new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
}

export async function createCotizacion(input: CreateCotizacionInput): Promise<string> {
  const now = new Date().toISOString()
  const ronda1 = {
    ronda: 1,
    autorRol: 'buyer_b2b',
    kgSolicitados: input.kgSolicitados,
    precioOfertadoCents: input.precioOfertadoCents,
    plazoEntrega: input.plazoEntrega,
    mensaje: input.mensaje ?? '',
    createdAt: now,
  }
  const payload = {
    productoId: input.productoId,
    productoNombre: input.productoNombre,
    caficultorId: input.caficultorId,
    caficultorNombre: input.caficultorNombre,
    negocioId: input.negocioId,
    negocioNombre: input.negocioNombre,
    negocioRazonSocial: input.negocioRazonSocial ?? '',
    ...(input.negocioRuc ? { negocioRuc: input.negocioRuc } : {}),
    estado: 'ENVIADA',
    rondas: [ronda1],
    rondaActual: 1,
    expiraAt: expiraAt7d(),
    createdAt: now,
    updatedAt: now,
  }
  console.debug('[Cotizacion] Intentando crear cotización en Firestore:', {
    negocioId: payload.negocioId,
    productoId: payload.productoId,
    collection: ONE_COLLECTIONS.COTIZACIONES,
  })
  try {
    const ref = await addDoc(collection(db, ONE_COLLECTIONS.COTIZACIONES), payload)
    console.debug('[Cotizacion] Cotización creada con ID:', ref.id)
    return ref.id
  } catch (err) {
    console.error('[Cotizacion] Error en Firestore addDoc:', err)
    throw err
  }
}

export async function fetchCotizacionesNegocio(negocioId: string): Promise<CotizacionONE[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.COTIZACIONES),
      where('negocioId', '==', negocioId),
    )
  )
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as CotizacionONE))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

export async function fetchCotizacionesCaficultor(caficultorId: string): Promise<CotizacionONE[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.COTIZACIONES),
      where('caficultorId', '==', caficultorId),
    )
  )
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as CotizacionONE))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

export async function responderCotizacion(input: ResponderCotizacionInput): Promise<void> {
  const ref = doc(db, ONE_COLLECTIONS.COTIZACIONES, input.cotizacionId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Cotización no encontrada')
  const cot = snap.data() as CotizacionONE

  if (input.accion === 'aceptar') {
    await updateDoc(ref, { estado: 'ACEPTADA', updatedAt: new Date().toISOString(), expiraAt: null })
    await createPedidoFromCotizacion(input.cotizacionId)
    return
  }
  if (input.accion === 'rechazar') {
    await updateDoc(ref, { estado: 'RECHAZADA', updatedAt: new Date().toISOString(), expiraAt: null })
    return
  }

  // contraofertar
  const rondaSig = cot.rondaActual + 1
  if (rondaSig > 3) throw new Error('Máximo 3 rondas de negociación')
  const nuevaRonda = {
    ronda: rondaSig,
    autorRol: input.autorRol,
    kgSolicitados: input.kgSolicitados ?? cot.rondas[cot.rondas.length - 1].kgSolicitados,
    precioOfertadoCents: input.precioOfertadoCents ?? cot.rondas[cot.rondas.length - 1].precioOfertadoCents,
    plazoEntrega: input.plazoEntrega ?? cot.rondas[cot.rondas.length - 1].plazoEntrega,
    mensaje: input.mensaje ?? '',
    createdAt: new Date().toISOString(),
  }
  await updateDoc(ref, {
    estado: input.autorRol === 'buyer_b2b' ? 'CONTRAOFERTA' : 'RESPONDIDA',
    rondas: [...cot.rondas, nuevaRonda],
    rondaActual: rondaSig,
    expiraAt: expiraAt7d(),
    updatedAt: new Date().toISOString(),
  })
}

// Crea un pedido a partir de una cotización ACEPTADA usando una batch write atómica.
// Retorna el pedidoId generado.
export async function createPedidoFromCotizacion(cotizacionId: string): Promise<string> {
  const cotRef = doc(db, ONE_COLLECTIONS.COTIZACIONES, cotizacionId)
  const cotSnap = await getDoc(cotRef)
  if (!cotSnap.exists()) throw new Error(`Cotización ${cotizacionId} no encontrada`)
  const cot = cotSnap.data() as CotizacionONE

  // Precio acordado = última ronda de negociación
  const ultimaRonda = cot.rondas[cot.rondas.length - 1]
  const kgSolicitados = ultimaRonda.kgSolicitados
  const precioKgCents = ultimaRonda.precioOfertadoCents
  const totalCents = Math.round(precioKgCents * kgSolicitados)

  const pedidoId = generarIdPedido()
  const now = new Date().toISOString()

  const pedido = {
    id: pedidoId,
    negocioId: cot.negocioId,
    negocioNombre: cot.negocioNombre,
    negocioEmail: '',
    negocioTelefono: '',
    ...(cot.negocioRazonSocial ? { negocioRazonSocial: cot.negocioRazonSocial } : {}),
    nombreLocal: cot.negocioNombre,
    distritoLocal: '',
    caficultorId: cot.caficultorId,
    items: [
      {
        productoId: cot.productoId,
        productoNombre: cot.productoNombre,
        caficultorId: cot.caficultorId,
        caficultorNombre: cot.caficultorNombre,
        presentacion: `${kgSolicitados}kg` as FormatoONE,
        qty: 1,
        unitCents: totalCents,
        subtotalCents: totalCents,
      },
    ],
    subtotalCents: totalCents,
    deliveryCents: 0,
    totalCents,
    metodoPago: 'transferencia' as const,
    pagoStatus: 'pendiente' as const,
    logisticaStatus: 'preparando' as const,
    estado: 'confirmado',
    origenCotizacion: cotizacionId,
    // ORD-03: B2B orders expire in 72 h (3 days) — not 24h like B2C
    expiraAt: expiraAtB2BPedido(),
    // B2B-05 / TRIB-02: fiscal fields forwarded from cotización
    rolComprador: 'buyer_b2b',
    ...(cot.negocioRuc ? { rucEmpresa: cot.negocioRuc } : {}),
    ...(cot.negocioRazonSocial ? { razonSocialEmpresa: cot.negocioRazonSocial } : {}),
    // buyer_b2b always receives factura per TRIB-02
    tipoComprobante: 'factura',
    payment: { status: 'RETAINED' },
    kitGenerado: false,
    calificado: false,
    recepcionConfirmada: false,
    esKitProveedor: false,
    isReposicion: false,
    createdAt: now,
    updatedAt: now,
  }

  const batch = writeBatch(db)

  const pedidoRef = doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId)
  batch.set(pedidoRef, pedido)

  batch.update(cotRef, {
    estado: 'ACEPTADA',
    pedidoId,
    updatedAt: now,
  })

  await batch.commit()

  return pedidoId
}

// ─── PAGOS CAFICULTOR ─────────────────────────────────────────────────────────

export async function fetchPagosByCaficultor(caficultorId: string): Promise<PagoCaficultorONE[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.PAGOS_CAFICULTOR),
      where('caficultorId', '==', caficultorId),
    )
  )
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as PagoCaficultorONE))
    .sort((a, b) => ((b as any).createdAt ?? '').localeCompare((a as any).createdAt ?? ''))
}

export async function liberarPago(pagoId: string, adminUid: string, metodoPago: string, cuentaDestino: string): Promise<void> {
  const ref = doc(db, ONE_COLLECTIONS.PAGOS_CAFICULTOR, pagoId)
  await updateDoc(ref, {
    estado: 'LIBERADO',
    metodoPago,
    cuentaDestino,
    liberadoPor: adminUid,
    liberadoAt: new Date().toISOString(),
  })
}

// ─── EVIDENCIAS / REVIEWER ───────────────────────────────────────────────────

export async function fetchEvidenciasPendientes(): Promise<EvidenciaONE[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.EVIDENCIAS),
      where('estado', 'in', ['PENDING_REVIEW', 'DISPUTED']),
    )
  )
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as EvidenciaONE))
    .sort((a, b) => ((a as any).createdAt ?? '').localeCompare((b as any).createdAt ?? ''))
}

export async function fetchEvidenciasByProducto(productoId: string): Promise<EvidenciaONE[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.EVIDENCIAS),
      where('productoId', '==', productoId),
    )
  )
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as EvidenciaONE))
    .sort((a, b) => ((b as any).createdAt ?? '').localeCompare((a as any).createdAt ?? ''))
}

export async function aprobarEvidencia(input: AprobarEvidenciaInput): Promise<void> {
  const ref = doc(db, ONE_COLLECTIONS.EVIDENCIAS, input.evidenciaId)
  await updateDoc(ref, {
    estado: 'APPROVED',
    revisadoPor: input.reviewerUid,
    revisadoAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export async function rechazarEvidencia(input: RechazarEvidenciaInput): Promise<void> {
  const ref = doc(db, ONE_COLLECTIONS.EVIDENCIAS, input.evidenciaId)
  await updateDoc(ref, {
    estado: 'REJECTED',
    revisadoPor: input.reviewerUid,
    revisadoAt: new Date().toISOString(),
    motivoRechazo: input.motivo,
    updatedAt: new Date().toISOString(),
  })
}

export async function crearEvidencia(input: {
  productoId: string
  productoNombre: string
  caficultorId: string
  caficultorNombre: string
  nivel: 'N1' | 'N2' | 'N3'
  titulo: string
  archivoUrl: string
  archivoTipo: 'imagen' | 'pdf'
}): Promise<string> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, ONE_COLLECTIONS.EVIDENCIAS), {
    ...input,
    estado: 'PENDING_REVIEW',
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

// ─── RECLAMOS / DEVOLUCIONES ─────────────────────────────────────────────────

export async function createReclamo(input: CreateReclamoInput, uid: string): Promise<string> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, ONE_COLLECTIONS.RECLAMOS), {
    ...input,
    fotosUrls: input.fotosUrls ?? [],
    estado: 'ABIERTO',
    creadoPor: uid,
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function fetchReclamosByNegocio(negocioId: string): Promise<ReclamoONE[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.RECLAMOS),
      where('negocioId', '==', negocioId),
    )
  )
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as ReclamoONE))
    .sort((a, b) => ((b as any).createdAt ?? '').localeCompare((a as any).createdAt ?? ''))
}

export async function fetchReclamosByCaficultor(caficultorId: string): Promise<ReclamoONE[]> {
  const snap = await getDocs(
    query(
      collection(db, ONE_COLLECTIONS.RECLAMOS),
      where('caficultorId', '==', caficultorId),
    )
  )
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as ReclamoONE))
    .sort((a, b) => ((b as any).createdAt ?? '').localeCompare((a as any).createdAt ?? ''))
}

export async function fetchReclamoById(reclamoId: string): Promise<ReclamoONE | null> {
  const snap = await getDoc(doc(db, ONE_COLLECTIONS.RECLAMOS, reclamoId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as ReclamoONE
}

// ─── RECLAMOS ADMIN ───────────────────────────────────────────────────────────

/** Trae todos los reclamos (vista admin) ordenados por fecha desc, sin filtro de uid */
export async function fetchReclamosAdmin(): Promise<ReclamoONE[]> {
  let snap
  try {
    snap = await getDocs(
      query(
        collection(db, ONE_COLLECTIONS.RECLAMOS),
        orderBy('createdAt', 'desc')
      )
    )
  } catch (err) {
    // Fallback: si orderBy falla (p.ej. docs sin createdAt o índice pendiente),
    // traer la colección entera y ordenar en cliente.
    console.warn('[fetchReclamosAdmin] orderBy falló, usando fallback sin orden:', err)
    snap = await getDocs(collection(db, ONE_COLLECTIONS.RECLAMOS))
  }
  const docs = snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    createdAt: normalizeDate(d.data().createdAt),
    updatedAt: normalizeDate(d.data().updatedAt),
  } as ReclamoONE))
  // Ordenar en cliente para garantizar resultado correcto en ambos casos
  return docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export type DecisionDisputa = 'RESOLUCION_COMPRADOR' | 'RESOLUCION_CAFICULTOR'

export interface ResolverDisputaInput {
  reclamoId: string
  decision: DecisionDisputa
  refundPct?: number          // 0–100, si es RESOLUCION_COMPRADOR
  notaInterna: string
  notaComprador?: string
  notaCaficultor?: string
  reviewerUid: string
}

/**
 * Paso 1 — Registra la decisión humana y pasa el reclamo a DECISION_PENDIENTE.
 * Escribe en one_auditoria el evento.
 */
export async function resolverDisputa(input: ResolverDisputaInput): Promise<void> {
  const ref = doc(db, ONE_COLLECTIONS.RECLAMOS, input.reclamoId)
  const now = new Date().toISOString()

  const humanDecision: Record<string, unknown> = {
    decision: input.decision,
    ...(input.refundPct !== undefined && { refundPct: input.refundPct }),
    notaInterna: input.notaInterna,
    ...(input.notaComprador ? { notaComprador: input.notaComprador } : {}),
    ...(input.notaCaficultor ? { notaCaficultor: input.notaCaficultor } : {}),
    registradoPor: input.reviewerUid,
    registradoAt: now,
  }

  await updateDoc(ref, {
    humanDecision,
    estado: 'DECISION_PENDIENTE' as const,
    revisadoPor: input.reviewerUid,
    revisadoAt: now,
    updatedAt: now,
  })

  // Auditoria
  await addDoc(collection(db, 'one_auditoria'), {
    tipo: 'DISPUTA_DECISION',
    reclamoId: input.reclamoId,
    decision: input.decision,
    ...(input.refundPct !== undefined && { refundPct: input.refundPct }),
    reviewerUid: input.reviewerUid,
    createdAt: now,
  })
}

/**
 * Paso 2 — Confirma la ejecución financiera.
 * Cambia estado a EJECUCION_FINANCIERA y luego a RESUELTO_COMPRADOR / RESUELTO_CAFICULTOR.
 * En producción real, aquí se llamaría al proveedor de pagos.
 */
export async function confirmarEjecucionFinanciera(reclamoId: string, reviewerUid: string): Promise<void> {
  const ref = doc(db, ONE_COLLECTIONS.RECLAMOS, reclamoId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Reclamo no encontrado')
  const reclamo = snap.data() as ReclamoONE & { humanDecision?: { decision: string } }
  const now = new Date().toISOString()

  const estadoFinal = reclamo.humanDecision?.decision === 'RESOLUCION_COMPRADOR'
    ? 'RESUELTO_COMPRADOR'
    : 'RESUELTO_CAFICULTOR'

  await updateDoc(ref, {
    estado: 'EJECUCION_FINANCIERA' as const,
    updatedAt: now,
  })

  // En producción: await proveedorPagos.ejecutarReembolso(...)
  // Por ahora lo marcamos resuelto directamente
  await updateDoc(ref, {
    estado: estadoFinal as ReclamoONE['estado'],
    updatedAt: new Date().toISOString(),
  })

  await addDoc(collection(db, 'one_auditoria'), {
    tipo: 'DISPUTA_EJECUTADA',
    reclamoId,
    estadoFinal,
    reviewerUid,
    createdAt: now,
  })
}

/**
 * Reintenta la ejecución financiera después de un fallo.
 * Reactiva al estado EJECUCION_FINANCIERA para un nuevo intento.
 */
export async function reintentarEjecucionFinanciera(reclamoId: string, reviewerUid: string): Promise<void> {
  return confirmarEjecucionFinanciera(reclamoId, reviewerUid)
}

/**
 * Envía solicitud de información adicional al comprador.
 * Cambia estado a ESPERANDO_INFO.
 */
export async function solicitarInfoDisputa(reclamoId: string, nota: string, reviewerUid: string): Promise<void> {
  const ref = doc(db, ONE_COLLECTIONS.RECLAMOS, reclamoId)
  const now = new Date().toISOString()
  await updateDoc(ref, {
    estado: 'ESPERANDO_INFO' as const,
    notaTW: nota,
    revisadoPor: reviewerUid,
    revisadoAt: now,
    updatedAt: now,
  })
  await addDoc(collection(db, 'one_auditoria'), {
    tipo: 'DISPUTA_SOLICITUD_INFO',
    reclamoId,
    nota,
    reviewerUid,
    createdAt: now,
  })
}

// US-447: Cancelar pedido — solo desde pagoStatus=verificado + logisticaStatus=preparando
// Al cancelar: pedido marcado cancelado=true, escrow a reembolsar, stock restaurado.
export async function cancelarPedido(pedidoId: string, motivo: string): Promise<void> {
  const pedidoRef = doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId)
  await runTransaction(db, async (tx) => {
    const pedidoSnap = await tx.get(pedidoRef)
    if (!pedidoSnap.exists()) throw new Error('Pedido no encontrado')
    const pedido = pedidoSnap.data()
    if (pedido.cancelado) throw new Error('El pedido ya fue cancelado')
    if (pedido.pagoStatus !== 'verificado' || pedido.logisticaStatus !== 'preparando') {
      throw new Error('Solo se puede cancelar un pedido en estado PAID (pago verificado, aún no despachado)')
    }
    // Restaurar stock de cada item
    const items: Array<{ productoId: string; cantidad: number }> = pedido.items ?? []
    for (const item of items) {
      const prodRef = doc(db, ONE_COLLECTIONS.PRODUCTOS, item.productoId)
      const prodSnap = await tx.get(prodRef)
      if (prodSnap.exists()) {
        const stockActual = prodSnap.data().stock ?? 0
        tx.update(prodRef, { stock: stockActual + item.cantidad, updatedAt: new Date().toISOString() })
      }
    }
    tx.update(pedidoRef, {
      cancelado: true,
      motivoCancelacion: motivo,
      canceladoAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  })
}

// Cancela un pedido expirado por no subir voucher (pagoStatus === 'pendiente').
// Restaura stock usando kgDisponibles en one_productos para cada item del pedido.
// NO permite cancelar si pagoStatus === 'verificado' o 'voucher_subido' — esos van por cancelarPedido().
export async function cancelarPedidoExpirado(pedidoId: string, adminUid?: string): Promise<void> {
  const pedidoRef = doc(db, ONE_COLLECTIONS.PEDIDOS, pedidoId)
  await runTransaction(db, async (tx) => {
    const pedidoSnap = await tx.get(pedidoRef)
    if (!pedidoSnap.exists()) throw new Error('Pedido no encontrado')
    const pedido = pedidoSnap.data()

    if (pedido.cancelado) throw new Error('El pedido ya fue cancelado')

    if (pedido.pagoStatus === 'verificado' || pedido.pagoStatus === 'voucher_subido') {
      throw new Error(
        `No se puede cancelar como expirado un pedido con pagoStatus="${pedido.pagoStatus}". Usar cancelarPedido() para pedidos en flujo normal.`
      )
    }

    if (pedido.pagoStatus !== 'pendiente') {
      throw new Error(
        `cancelarPedidoExpirado solo acepta pagoStatus="pendiente". Estado actual: "${pedido.pagoStatus}"`
      )
    }

    // Restaurar stock: iterar items y sumar kg correspondientes a kgDisponibles del producto
    const items: Array<{ productoId: string; qty: number; presentacion: string }> = pedido.items ?? []
    for (const item of items) {
      const prodRef = doc(db, ONE_COLLECTIONS.PRODUCTOS, item.productoId)
      const prodSnap = await tx.get(prodRef)
      if (prodSnap.exists()) {
        const kgARestaurar = parseKgFromPresentacion(item.presentacion as FormatoONE, item.qty)
        const kgActual = prodSnap.data().kgDisponibles ?? 0
        tx.update(prodRef, {
          kgDisponibles: kgActual + kgARestaurar,
          updatedAt: new Date().toISOString(),
        })
      }
    }

    tx.update(pedidoRef, {
      cancelado: true,
      motivoCancelacion: 'PAYMENT_EXPIRED',
      cancellationReason: 'PAYMENT_EXPIRED',
      canceladoAt: new Date().toISOString(),
      ...(adminUid ? { canceladoPor: adminUid } : {}),
      updatedAt: new Date().toISOString(),
    })
  })
}
