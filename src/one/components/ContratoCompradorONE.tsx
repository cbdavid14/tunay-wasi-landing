import PaginaLegal from './PaginaLegal'

export default function ContratoCompradorONE() {
  return (
    <PaginaLegal
      titulo="Contrato de Comprador"
      subtitulo="Condiciones específicas para compradores en Tunay Wasi"
      fecha="noviembre 2026"
      sections={[
        {
          title: '1. Ámbito',
          body: 'Este contrato complementa los Términos y Condiciones generales y aplica exclusivamente a los usuarios registrados como compradores (consumidores finales o empresas) en la plataforma Tunay Wasi.',
        },
        {
          title: '2. Obligaciones del comprador',
          body: [
            'Proporcionar una dirección de entrega válida y datos de contacto actualizados.',
            'Estar presente o designar a una persona para recibir el pedido en el domicilio indicado.',
            'Realizar el pago completo antes de la confirmación del pedido.',
            'Revisar el producto al momento de la entrega y reportar cualquier disconformidad dentro del plazo establecido.',
          ],
        },
        {
          title: '3. Compradores empresa (aprobación previa)',
          body: [
            'Las cuentas de empresa requieren la presentación de RUC activo y en régimen que permita emitir y recibir facturas electrónicas.',
            'Tunay Wasi se reserva hasta 2 días hábiles para revisar la solicitud de aprobación.',
            'Una vez aprobada, la cuenta empresa accede a precios por volumen y facturación electrónica.',
          ],
        },
        {
          title: '4. Escrow y confirmación de entrega',
          body: [
            'El importe abonado queda retenido por Tunay Wasi hasta que el comprador confirme la recepción conforme, o hasta que transcurran 7 días calendario desde la entrega registrada por el courier sin reclamación.',
            'Pasado ese plazo sin reclamación, el pago se libera automáticamente al caficultor.',
          ],
        },
        {
          title: '5. Cancelaciones',
          body: [
            'El comprador puede cancelar el pedido sin cargo dentro de la primera hora desde la confirmación de pago, siempre que el lote no haya sido despachado.',
            'Tras el despacho no se admiten cancelaciones; aplica el proceso de devolución.',
          ],
        },
        {
          title: '6. Devoluciones',
          body: [
            'Se aceptan devoluciones si el producto presenta: peso inferior al declarado (tolerancia ±3 %), especie o proceso diferente al publicado, o daño visible causado en el transporte.',
            'El comprador debe enviar fotografías al correo tunaywasi@gmail.com dentro del plazo de reclamación.',
            'En caso de devolución procedente, Tunay Wasi gestiona la recolección del producto y procesa el reembolso en un plazo máximo de 5 días hábiles.',
          ],
        },
        {
          title: '7. Facturación',
          body: 'Los consumidores finales reciben boleta electrónica. Las empresas aprobadas reciben factura electrónica a su RUC. Los comprobantes se envían al correo registrado dentro de las 24 h siguientes al pago.',
        },
      ]}
    />
  )
}
