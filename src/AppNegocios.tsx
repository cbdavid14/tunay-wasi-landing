import SupplyNav from '@/features/negocios/components/SupplyNav';
import SupplyHero from '@/features/negocios/components/SupplyHero';
import SupplyLotes from '@/features/negocios/components/SupplyLotes';
import SupplyProceso from '@/features/negocios/components/SupplyProceso';
import SupplyGifting from '@/features/negocios/components/SupplyGifting';
import SupplyForm from '@/features/negocios/components/SupplyForm';
import { CafiFooter } from '@/features/caficultores/components/CafiFinalCTA';

export default function AppMayoristas() {
  return (
    <>
      <SupplyNav />
      <main>
        <SupplyHero />
        <SupplyLotes />
        <SupplyProceso />
        <SupplyGifting />
        <SupplyForm />
      </main>
      <CafiFooter />
    </>
  );
}
