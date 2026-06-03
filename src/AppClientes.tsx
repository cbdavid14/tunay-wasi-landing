import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/shared/firebase';
import { ensurePortalUserProfile, getPortalAuthUser, isRegistering, type PortalAuthUser } from '@/features/portal/portalAuthService';
import Nav from '@/components/layout/Nav';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import Origen from '@/components/sections/Origen';
import Modelo from '@/components/sections/Modelo';
import CartButton from '@/components/cart/CartButton';
import CartDrawer from '@/components/cart/CartDrawer';
import Preventa from '@/features/preventa/components/Preventa';
import Caficultores from '@/features/catalog/components/Caficultores';
import Cafe from '@/features/catalog/components/Cafe';
import Contacto from '@/features/contact/components/Contacto';
import CheckoutGate from '@/features/checkout/components/CheckoutGate';
import GrainOverlay from '@/components/decor/GrainOverlay';
import { AdminPedidos } from '@/features/admin/AdminPedidos';
import PortalShell from '@/features/portal/PortalShell';

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminPedidos />} />
      <Route path="/portal/*" element={<PortalShell />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}

function Landing() {
  const [authUser, setAuthUser] = useState<PortalAuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setAuthUser(null);
          return;
        }
        if (isRegistering()) return;
        await ensurePortalUserProfile(firebaseUser);
        setAuthUser(await getPortalAuthUser(firebaseUser));
      } catch (err) {
        console.error('[Landing] auth error:', err);
        setAuthUser(null);
      } finally {
        setAuthReady(true);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const observer = new MutationObserver(() => {
      const target = document.getElementById(hash);
      if (target) {
        observer.disconnect();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <GrainOverlay/>
      <Nav user={authUser} authReady={authReady} onAuthChange={setAuthUser}/>
      <main>
        <Hero/>
        <Preventa/>
        <Origen/>
        <Caficultores/>
        <Cafe/>
        <Modelo/>
        <Contacto/>
      </main>
      <Footer/>
      <CartButton/>
      <CartDrawer/>
      <CheckoutGate/>
    </>
  );
}
