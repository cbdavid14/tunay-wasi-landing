/**
 * auth.ts — Tipos de autenticación y perfiles de usuario
 *
 * Colección Firestore: /mkt_usuarios/{uid}
 * El UID es el mismo que Firebase Auth.
 */

export type RolUsuario = 'caficultor' | 'cafeteria' | 'laboratorio' | 'admin' | 'cliente';

interface PerfilBase {
  uid: string;           // = Firebase Auth UID
  rol: RolUsuario;
  nombre: string;
  email?: string;
  telefono?: string;     // formato internacional: +51XXXXXXXXX
  createdAt: string;     // ISO 8601
}

export interface PerfilCaficultor extends PerfilBase {
  rol: 'caficultor';
  finca: string;
  region: string;
}

export interface PerfilCafeteria extends PerfilBase {
  rol: 'cafeteria';
  empresa: string;
  ruc: string;
  tieneLaboratorio: boolean;
  direccionEntrega: string;
}

export interface PerfilLaboratorio extends PerfilBase {
  rol: 'laboratorio';
  nombreComercial: string;
  certificaciones: string[];   // ["Q-Grader CQI", "SCA Authorized"]
  feeCatacionPEN: number;      // lo fija el laboratorio
  feeTuestePEN: number;
}

export interface PerfilAdmin extends PerfilBase {
  rol: 'admin';
}

export interface PerfilCliente extends PerfilBase {
  rol: 'cliente';
  orderId?: string;   // último pedido asociado al registro
}

export type PerfilDoc =
  | PerfilCaficultor
  | PerfilCafeteria
  | PerfilLaboratorio
  | PerfilAdmin
  | PerfilCliente;
