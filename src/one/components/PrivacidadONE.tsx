import PaginaLegal from './PaginaLegal'

export default function PrivacidadONE() {
  return (
    <PaginaLegal
      titulo="Política de Privacidad"
      subtitulo="Tratamiento de datos personales — AL PASO LIVE S.A.C."
      fecha="noviembre 2026"
      sections={[
        {
          title: '1. Responsable del tratamiento',
          body: 'AL PASO LIVE S.A.C., con RUC 20615431631, domiciliada en Cal. El Greco 223 Dpto. 302, San Borja, Lima, Perú. Correo de contacto para privacidad: soporte@tunay-wasi.com.',
        },
        {
          title: '2. Datos que recopilamos',
          body: [
            'Datos de identidad: nombre, apellidos, DNI/RUC (solo para facturación).',
            'Datos de contacto: correo electrónico, número de teléfono, dirección de entrega.',
            'Datos de uso: historial de pedidos, preferencias de búsqueda, interacciones con la plataforma.',
            'Datos técnicos: dirección IP, tipo de dispositivo, navegador (mediante Firebase Analytics).',
          ],
        },
        {
          title: '3. Finalidad del tratamiento',
          body: [
            'Gestionar el registro y la cuenta del usuario.',
            'Procesar pedidos, pagos y devoluciones.',
            'Emitir comprobantes de pago electrónicos (SUNAT).',
            'Enviar comunicaciones transaccionales (confirmación de pedido, estado de envío).',
            'Mejorar la plataforma mediante análisis de uso agregado y anónimo.',
            'Cumplir obligaciones legales y regulatorias aplicables en el Perú.',
          ],
        },
        {
          title: '4. Base legal',
          body: 'El tratamiento se basa en la ejecución del contrato de compraventa (Art. 11 Ley 29733), el cumplimiento de obligaciones legales (SUNAT, Indecopi) y el interés legítimo para la seguridad y mejora de la plataforma.',
        },
        {
          title: '5. Destinatarios',
          body: [
            'Operadores logísticos (Shalom, Olva, Hub Lima): nombre y dirección de entrega, estrictamente para el despacho.',
            'Pasarelas de pago (Niubiz/Yape): datos necesarios para procesar la transacción.',
            'Firebase / Google Cloud: alojamiento de datos bajo acuerdo de procesador de datos con cláusulas contractuales estándar.',
            'No vendemos ni cedemos datos personales a terceros con fines comerciales.',
          ],
        },
        {
          title: '6. Conservación',
          body: 'Los datos de cuenta se conservan mientras la cuenta esté activa. Los datos de transacciones se mantienen 7 años por obligación tributaria (SUNAT). Los datos de analytics se anonimizan a los 26 meses.',
        },
        {
          title: '7. Derechos del titular (ARCO)',
          body: [
            'Acceso: solicitar qué datos tenemos sobre usted.',
            'Rectificación: corregir datos inexactos.',
            'Cancelación: solicitar la eliminación de sus datos cuando no sean necesarios.',
            'Oposición: oponerse al tratamiento para fines de marketing.',
            'Para ejercer sus derechos, envíe un correo a soporte@tunay-wasi.com con asunto "ARCO + su nombre". Respondemos en 10 días hábiles.',
          ],
        },
        {
          title: '8. Seguridad',
          body: 'Aplicamos cifrado TLS en tránsito y AES-256 en reposo para datos sensibles. Los accesos a bases de datos están restringidos por rol. Realizamos copias de seguridad diarias.',
        },
        {
          title: '9. Ley aplicable',
          body: 'Esta política se rige por la Ley 29733 (Protección de Datos Personales) y su Reglamento D.S. 003-2013-JUS, vigentes en el Perú.',
        },
      ]}
    />
  )
}
