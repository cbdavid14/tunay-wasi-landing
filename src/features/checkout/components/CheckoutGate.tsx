import Checkout from './Checkout';
import CheckoutV1 from './CheckoutV1';
import { useCheckoutConfig } from '@/features/catalog/useCheckoutConfig';

export default function CheckoutGate() {
  const { data: config } = useCheckoutConfig();
  if (config?.version === 'v1') return <CheckoutV1 />;
  return <Checkout />;
}
