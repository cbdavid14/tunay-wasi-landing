import PaginaLegal from './PaginaLegal'

export default function TerminosONE() {
  return (
    <PaginaLegal
      titulo="Términos y Condiciones"
      subtitulo="Plataforma Tunay Wasi — AL PASO LIVE S.A.C."
      fecha="noviembre 2026"
      sections={[
        {
          title: '1. Objeto',
          body: 'Tunay Wasi es una plataforma de comercio electrónico operada por AL PASO LIVE S.A.C. (RUC 20615431631) que conecta productores de café de especialidad con compradores en el Perú. Los presentes Términos regulan el acceso y uso de la plataforma disponible en tunay-wasi.com.',
        },
        {
          title: '2. Partes',
          body: [
            'Operador: AL PASO LIVE S.A.C., empresa inscrita en SUNÁT, con domicilio en Cal. El Greco 223 Dpto. 302, San Borja, Lima.',
            'Caficultor: productor de café que publica y vende lotes a través de la plataforma.',
            'Comprador: persona natural o jurídica que adquiere productos publicados en la plataforma.',
          ],
        },
        {
          title: '3. Registro y cuenta',
          body: [
            'El registro requiere datos verídicos. Cada usuario es responsable de la confidencialidad de sus credenciales.',
            'Las cuentas de empresa (compradores B2B) quedan sujetas a un proceso de aprobación antes de poder realizar pedidos.',
            'Tunay Wasi se reserva el derecho de suspender cuentas que incumplan estos Términos.',
          ],
        },
        {
          title: '4. Proceso de compra y pago',
          body: [
            'El precio de cada lote es fijado por el caficultor y mostrado en la plataforma con IGV incluido.',
            'Los pagos se procesan mediante los métodos disponibles (Yape, transferencia bancaria, tarjeta Niubiz). El dinero queda retenido en custodia (escrow) hasta confirmar la entrega conforme.',
            'Una vez confirmada la entrega, el pago neto se transfiere al caficultor según el calendario de liquidación vigente.',
          ],
        },
        {
          title: '5. Envíos y entrega',
          body: [
            'Los despachos se realizan con operadores registrados (Shalom, Olva, Hub Lima). Los plazos estimados son 24–48 h para Lima y 2–5 días para provincias.',
            'El riesgo sobre el producto pasa al comprador una vez que el courier registra la recepción del paquete.',
          ],
        },
        {
          title: '6. Devoluciones y reclamaciones',
          body: [
            'El comprador puede iniciar un reclamo dentro de las 48 h siguientes a la entrega (negocios) o 72 h (consumidor final) si el producto no coincide con la descripción publicada.',
            'El Libro de Reclamaciones digital está disponible en tunay-wasi.com/#/reclamaciones conforme al D.Leg. 1510.',
          ],
        },
        {
          title: '7. Comisiones — Fase beta',
          body: 'Durante la fase beta la plataforma no cobra comisión al caficultor ni al comprador. Esta condición puede cambiar con aviso previo de 30 días.',
        },
        {
          title: '8. Propiedad intelectual',
          body: 'El contenido de la plataforma (marca, diseño, código) es propiedad de AL PASO LIVE S.A.C. Las fotografías e historias de cada caficultor son de su propiedad y se publican con su autorización expresa.',
        },
        {
          title: '9. Ley aplicable',
          body: 'Estos Términos se rigen por las leyes de la República del Perú. Cualquier controversia se somete a los juzgados y tribunales de Lima, con renuncia a cualquier otro fuero.',
        },
      ]}
    />
  )
}
