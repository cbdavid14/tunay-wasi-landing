/**
 * AppMarketplace.tsx — Root de la plataforma B2B de café verde
 * VITE_APP_TARGET=marketplace
 *
 * 3 vistas según actor:
 *   - marketplace → Tostadora/Cafetería: catálogo, filtros, checkout
 *   - caficultor  → Caficultor: mis lotes, publicar lote, perfil
 *   - admin       → Hub Lima: catación Q-Grader, kanban logístico, precios
 */
import { useState } from 'react';
import MarketplaceNav from '@/features/marketplace/components/MarketplaceNav';
import MarketplaceLotes from '@/features/marketplace/components/MarketplaceLotes';
import CheckoutB2B from '@/features/marketplace/components/CheckoutB2B';
import CaficultorPortal from '@/features/marketplace/components/CaficultorPortal';
import AdminPanel from '@/features/marketplace/components/AdminPanel';
import type { LoteDoc } from '@/shared/types/marketplace';

type Vista = 'marketplace' | 'caficultor' | 'admin';

interface CarritoItem {
  lote: LoteDoc;
  tipo: 'muestra' | 'saco';
  sacos?: number;
}

export default function AppMarketplace() {
  const [vista, setVista] = useState<Vista>('marketplace');
  const [checkout, setCheckout] = useState<CarritoItem[] | null>(null);

  return (
    <>
      {/* Nav solo visible cuando no estamos en checkout */}
      {!checkout && (
        <MarketplaceNav vista={vista} onCambiarVista={(v) => { setVista(v); setCheckout(null); }} />
      )}

      {vista === 'marketplace' && !checkout && (
        <MarketplaceLotes onCheckout={(items) => setCheckout(items)} />
      )}

      {vista === 'marketplace' && checkout && (
        <CheckoutB2B
          items={checkout}
          onVolver={() => setCheckout(null)}
          onConfirmar={() => { setCheckout(null); }}
        />
      )}

      {vista === 'caficultor' && <CaficultorPortal />}

      {vista === 'admin' && <AdminPanel />}
    </>
  );
}
