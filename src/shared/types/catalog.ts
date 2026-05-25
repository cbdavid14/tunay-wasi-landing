import { TONE_OPTIONS, TAG_TONE_OPTIONS, PRODUCT_LABELS } from '../constants';

export type ToneOption   = (typeof TONE_OPTIONS)[number];
export type TagTone      = (typeof TAG_TONE_OPTIONS)[number];
export type ProductLabel = (typeof PRODUCT_LABELS)[number];

export type { CaficultorDoc } from './firestore';

export interface Producto {
  id: string;
  code: string;
  name: string;
  sub: string;
  region: string;
  alt: string;
  farm: string;
  producer: string;
  notes: string[];
  body: string;
  acidity: string;
  score: string;
  tag: string;
  tagTone: TagTone;
  brews: string[];
  weights: [string, number][];
  weightsPromo?: [string, number][];
  promoActivated?: boolean;
  producerPct: number;
  tone: ToneOption;
  stockKg: number;
  stockReservedKg?: number;
  desc: string;
  photo?: string;
  label?: ProductLabel;
  roastDate?: string;      // fecha estimada de tueste, ej. "~3 jun."
  qGraderName?: string;    // nombre del Q Grader que certificó el lote
  receta?: Record<string, {  // clave = método, ej. "V60" | "Chemex" | "French Press"
    ratio: string;         // "1:16 (15g / 240ml)"
    temp: string;          // "93°C"
    tiempo: string;        // "3:00–3:30 min"
    molienda: string;      // "Medio-fina (similar a sal gruesa)"
    nota?: string;         // consejo adicional opcional
  }>;
}

export interface Caficultor {
  id: string;
  name: string;
  farm: string;
  region: string;
  alt: string;
  variety: string;
  process: string;
  score: string;
  color: ToneOption;
  quote: string;
  summary?: string;      // resumen breve (opcional — mostrado en card)
  photo?: string;
  videoUrl?: string;     // mini-video de finca (15–30s), mp4 o URL de Cloudinary/YouTube
  // extended profile fields (optional — shown in modal)
  photos?: string[];
  bio?: string;
  socialImpact?: string;
  yearsExp?: number;
  farmHa?: number;
  location?: string;
  status?: string;
}


export interface CicloActivo {
  closeAt: string;
  deliverLima: string;
  deliverProv: string;
  cutoffTimestamp: number;
}
