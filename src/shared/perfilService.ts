/**
 * perfilService.ts — CRUD del perfil de usuario en Firestore
 * Colección: /mkt_usuarios/{uid}
 */
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/shared/firebase';
import type { PerfilDoc, PerfilLaboratorio, PerfilCafeteria } from '@/shared/types/auth';

export async function crearPerfil(uid: string, perfil: Omit<PerfilDoc, 'uid' | 'createdAt'>): Promise<PerfilDoc> {
  const doc_ = {
    ...perfil,
    uid,
    createdAt: new Date().toISOString(),
  } as PerfilDoc;
  const data = Object.fromEntries(Object.entries(doc_).filter(([, v]) => v !== undefined));
  await setDoc(doc(db, 'mkt_usuarios', uid), data);

  // Si es laboratorio, sincroniza también en mkt_laboratorios para que aparezca en el marketplace
  if (perfil.rol === 'laboratorio') {
    const p = perfil as Omit<PerfilLaboratorio, 'uid' | 'createdAt'>;
    const labDoc = Object.fromEntries(Object.entries({
      id: uid,
      razonSocial: p.nombre,
      nombreComercial: p.nombreComercial,
      contactoNombre: p.nombre,
      email: p.email ?? '',
      telefono: p.telefono ?? '',
      direccion: '',
      certificaciones: p.certificaciones ?? [],
      feeCatacionPEN: p.feeCatacionPEN ?? 0,
      feeTuestePEN: p.feeTuestePEN ?? 0,
      status: 'activo',
      createdAt: doc_.createdAt,
    }).filter(([, v]) => v !== undefined));
    await setDoc(doc(db, 'mkt_laboratorios', uid), labDoc);
  }

  return doc_;
}

export async function fetchPerfil(uid: string): Promise<PerfilDoc | null> {
  const snap = await getDoc(doc(db, 'mkt_usuarios', uid));
  if (!snap.exists()) return null;
  return snap.data() as PerfilDoc;
}

export async function vincularPedido(uid: string, orderId: string): Promise<void> {
  await updateDoc(doc(db, 'mkt_usuarios', uid), { orderId });
}

export async function fetchCafeterias(): Promise<PerfilCafeteria[]> {
  const snap = await getDocs(query(collection(db, 'mkt_usuarios'), where('rol', '==', 'cafeteria')));
  return snap.docs.map(d => d.data() as PerfilCafeteria);
}

export async function toggleTieneLaboratorio(uid: string, tieneLaboratorio: boolean): Promise<void> {
  await updateDoc(doc(db, 'mkt_usuarios', uid), { tieneLaboratorio });
}

/**
 * Asegura que el laboratorio tenga su doc en mkt_laboratorios.
 * Llámala al iniciar sesión como laboratorio (idempotente — usa setDoc merge).
 */
export async function sincronizarLabDoc(perfil: PerfilLaboratorio): Promise<void> {
  const labDoc = Object.fromEntries(Object.entries({
    id: perfil.uid,
    razonSocial: perfil.nombre,
    nombreComercial: perfil.nombreComercial,
    contactoNombre: perfil.nombre,
    email: perfil.email ?? '',
    telefono: perfil.telefono ?? '',
    direccion: '',
    certificaciones: perfil.certificaciones ?? [],
    feeCatacionPEN: perfil.feeCatacionPEN ?? 0,
    feeTuestePEN: perfil.feeTuestePEN ?? 0,
    status: 'activo',
    createdAt: perfil.createdAt,
  }).filter(([, v]) => v !== undefined));
  await setDoc(doc(db, 'mkt_laboratorios', perfil.uid), labDoc, { merge: true });
}
