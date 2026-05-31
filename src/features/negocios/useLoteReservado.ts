import { useState, useEffect } from 'react';

export interface LoteReservado {
  id: string;
  variedad: string;
  origen: string;
  sca: number;
  precioKg: number;
  // B2B: volumen y precio total del lote seleccionado
  kgSeleccionado?: string;   // "8kg" | "10kg" | "12kg" | "15kg"
  precioLote?: number;       // S/ precio total del lote (cents / 100)
  quieroMuestra?: boolean;   // true cuando viene del botón "Pedir muestra 200g"
}

let _current: LoteReservado | null = null;
const _subs = new Set<() => void>();

export function setLoteReservado(lote: LoteReservado | null): void {
  _current = lote;
  _subs.forEach(fn => fn());
}

export function useLoteReservado(): LoteReservado | null {
  const [lote, setLote] = useState<LoteReservado | null>(_current);
  useEffect(() => {
    const sync = () => setLote(_current);
    _subs.add(sync);
    return () => { _subs.delete(sync); };
  }, []);
  return lote;
}
