import { useEffect } from 'react';
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

export default function App() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    // Si el elemento aún no existe, reintenta hasta que aparezca
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
      <Nav/>
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
