import { Routes, Route } from 'react-router-dom';
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
import Checkout from '@/features/checkout/components/Checkout';
import GrainOverlay from '@/components/decor/GrainOverlay';
import FichaCaficultor from '@/pages/FichaCaficultor';

function LandingPage() {
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
      <Checkout/>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/ficha/:id" element={<FichaCaficultor />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
