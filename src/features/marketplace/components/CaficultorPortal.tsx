/**
 * CaficultorPortal.tsx — F01: Registro finca + F02: Publicar lote + F03: Estado de lotes
 * Actor: Caficultor (optimizado para móvil, zonas rurales)
 */
import { useState, useEffect, useRef } from 'react';
import { useIsMobile, padX, padY, inputStyle as mInputStyle, tabBarStyle, tabBtn, grid2, grid3 } from '@/shared/mobileStyles';
import {
  fetchMktLotesByCaficultor,
  fetchMktLotesByIds,
  createMktLote,
  despublicarMktLote,
  fetchMktSolicitudesByLoteIds,
  updateMktSolicitudStatus,
  fetchMktPedidosByCaficultor,
  confirmarEnvioPedido,
  fetchMktLaboratorios,
  updatePerfil,
  sincronizarCaficultorDoc,
  updateMktLoteFields,
  createSolicitudCertificacionAbierta,
  confirmarEnvioMuestraCertificacion,
  fetchMktSolicitudesCertificacionByCaficultor,
  fetchSolicitudesHub,
  confirmarEnvioCaficultor,
  createSolicitudHub,
  crearCalificacion,
  fetchCalificacionesByPedido,
  fetchCalificacionesByDestinatario,
  fetchMktPedidosByTostadora,
} from '@/features/marketplace/marketplaceService';
import type { LoteDoc, SolicitudMuestraDoc, PedidoB2BDoc, LaboratorioDoc, SolicitudCertificacionDoc, SolicitudHubDoc } from '@/shared/types/marketplace';
import { COMISION_TW, FLETE_POR_SACO_PEN } from '@/shared/config';
import type { PerfilCaficultor } from '@/shared/types/auth';
import NotifBell from '@/shared/NotifBell';
import { useNotificaciones } from '@/shared/useNotificaciones';

const C = {
  green: '#1f3028', cream: '#f2e0cc', terra: '#c96e4b',
  sage: '#8faf8a', tan: '#c4b297', brown: '#533b22',
};

const STATUS_INFO: Record<string, { label: string; color: string; desc: string }> = {
  borrador:    { label: 'Borrador', color: C.tan, desc: 'Completa los datos y publícalo cuando estés listo.' },
  en_catacion: { label: 'En certificación ⏳', color: '#8a6fc9', desc: 'Un laboratorio está catando tu café. Si el puntaje supera el umbral SCA, tu lote se publica automáticamente en el catálogo.' },
  publicado:   { label: 'Publicado ✓', color: C.sage, desc: 'Tu café está en el marketplace con puntaje SCA. Las cafeterías pueden comprarlo directamente.' },
  agotado:     { label: 'Agotado', color: C.terra, desc: 'Todos los sacos fueron vendidos. ¡Excelente!' },
  rechazado:   { label: 'Retirado', color: '#888', desc: 'El lote fue retirado del marketplace.' },
};

type Tab = 'mis_lotes' | 'solicitudes' | 'nuevo_lote' | 'mis_pagos' | 'perfil';

interface Props {
  caficultor: PerfilCaficultor;
  onLogout: () => void;
  modoEmbebido?: boolean;
  tabActivo?: Tab;
}

export default function CaficultorPortal({ caficultor, onLogout, modoEmbebido, tabActivo }: Props) {
  const { notifs } = useNotificaciones(caficultor.uid);
  const [tab, setTab] = useState<Tab>('mis_lotes');

  // Sincronizar tab controlado externamente → estado interno
  useEffect(() => {
    if (tabActivo && tabActivo !== tab) setTab(tabActivo);
  }, [tabActivo]);
  const [loteForm, setLoteForm] = useState({
    nombreLote: '', variedad: '', proceso: 'lavado',
    altitud: '', sacosDisponibles: '', precioOrigenPEN: '', cosecha: '', pesoPorSacoKg: '60',
    stockMuestrasHub: '5', muestraDisponible: 'true', puntajeReferencial: '',
    courierMuestrasHub: 'Shalom', guiaMuestrasHub: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorLote, setErrorLote] = useState<string | null>(null);
  const [publicando, setPublicando] = useState<string | null>(null);
  // Upload foto de lote
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  // Certificado existente
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certNombre, setCertNombre] = useState<string | null>(null);
  const [certUrl, setCertUrl] = useState<string | null>(null);
  // Edición y archivado de lotes
  const [editandoLote, setEditandoLote] = useState<LoteDoc | null>(null);
  const [editForm, setEditForm] = useState<{ nombreLote: string; precioOrigenPEN: string; sacosDisponibles: string; variedad: string; proceso: string; altitud: string; cosecha: string; pesoPorSacoKg: string; muestraDisponible: string; stockMuestrasHub: string }>({ nombreLote: '', precioOrigenPEN: '', sacosDisponibles: '', variedad: '', proceso: 'lavado', altitud: '', cosecha: '', pesoPorSacoKg: '60', muestraDisponible: 'true', stockMuestrasHub: '5' });
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [archivando, setArchivando] = useState<string | null>(null);
  const [filtroLotes, setFiltroLotes] = useState<'todos' | 'borrador' | 'publicado' | 'archivado'>('todos');
  // Upload inline desde tarjeta de lote
  const [subiendoFoto, setSubiendoFoto] = useState<string | null>(null);   // loteId
  const fotoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [misLotes, setMisLotes] = useState<LoteDoc[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudMuestraDoc[]>([]);
  const [misPedidos, setMisPedidos] = useState<PedidoB2BDoc[]>([]);
  const [laboratorios, setLaboratorios] = useState<LaboratorioDoc[]>([]);
  const [despachando, setDespachando] = useState<string | null>(null);
  const [enviandoSacos, setEnviandoSacos] = useState<string | null>(null);
  const [guiaForm, setGuiaForm] = useState<Record<string, { empresa: string; numero: string }>>({});
  // Certificación por caficultor
  const [misCertificaciones, setMisCertificaciones] = useState<SolicitudCertificacionDoc[]>([]);
  const [certGuiaForm, setCertGuiaForm] = useState<Record<string, { empresa: string; numero: string }>>({});
  const [subTabSolicitudes, setSubTabSolicitudes] = useState<'hub_lima' | 'certificacion'>('hub_lima');
  const [subTabMisLotes, setSubTabMisLotes] = useState<'despachar' | 'lotes'>('lotes');
  const [enviandoMuestraCert, setEnviandoMuestraCert] = useState<string | null>(null);
  // Solicitudes hub → caficultor (Flujo D)
  const [solicitudesHub, setSolicitudesHub] = useState<SolicitudHubDoc[]>([]);
  const [hubGuiaForm, setHubGuiaForm] = useState<Record<string, { empresa: string; numero: string }>>({});
  const [confirmandoHub, setConfirmandoHub] = useState<string | null>(null);
  // Formulario edición perfil
  const [perfilForm, setPerfilForm] = useState({ nombre: caficultor.nombre ?? '', finca: caficultor.finca ?? '', region: caficultor.region ?? '', telefono: caficultor.telefono ?? '' });
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [perfilGuardado, setPerfilGuardado] = useState(false);
  // Calificaciones post-transacción
  const [calificacionesYaHechas, setCalificacionesYaHechas] = useState<Set<string>>(new Set());
  const [modalCalifPedido, setModalCalifPedido] = useState<PedidoB2BDoc | null>(null);
  const [califPuntaje, setCalifPuntaje] = useState<1|2|3|4|5>(5);
  const [califComentario, setCalifComentario] = useState('');
  // Modal perfil cafetería
  const [modalCafeteria, setModalCafeteria] = useState<PedidoB2BDoc | null>(null);
  const [modalCafeteriaCalifs, setModalCafeteriaCalifs] = useState<{ promedio: number; total: number } | null>(null);
  const [modalCafeteriaPedidos, setModalCafeteriaPedidos] = useState<number | null>(null);
  const [guardandoCalif, setGuardandoCalif] = useState(false);

  useEffect(() => {
    fetchMktLotesByCaficultor(caficultor.uid).then(async lotes => {
      setMisLotes(lotes);
      const ids = lotes.map(l => l.id);
      fetchMktSolicitudesByLoteIds(ids).then(setSolicitudes);

      const peds = await fetchMktPedidosByCaficultor(caficultor.uid);
      // Resolver lotes de pedidos que no están en misLotes (ej. lote reasignado)
      const lotesMap = new Map(lotes.map(l => [l.id, l]));
      const loteIdsFaltantes = [...new Set(peds.map(p => p.loteId).filter(id => !lotesMap.has(id)))];
      if (loteIdsFaltantes.length > 0) {
        const extra = await fetchMktLotesByIds(loteIdsFaltantes);
        extra.forEach(l => lotesMap.set(l.id, l));
        setMisLotes(Array.from(lotesMap.values()));
      }
      setMisPedidos(peds);
      // Cargar calificaciones ya hechas para pedidos entregados
      const entregados = peds.filter(p => p.logisticaStatus === 'entregado');
      const calIds = new Set<string>();
      await Promise.all(entregados.map(async p => {
        const cals = await fetchCalificacionesByPedido(p.id);
        if (cals.some(c => c.autorId === caficultor.uid)) calIds.add(p.id);
      }));
      setCalificacionesYaHechas(calIds);
    });
    fetchMktLaboratorios().then(setLaboratorios);
    fetchMktSolicitudesCertificacionByCaficultor(caficultor.uid).then(setMisCertificaciones);
    fetchSolicitudesHub(caficultor.uid).then(setSolicitudesHub);
  }, [submitted, caficultor.uid, notifs.length]);

  function setField(k: string, v: string) { setLoteForm(f => ({ ...f, [k]: v })); }

  async function handleConfirmarEnvioHub(solicitudId: string, loteId: string) {
    const guia = hubGuiaForm[solicitudId];
    if (!guia?.empresa || !guia?.numero) return;
    setConfirmandoHub(solicitudId);
    await confirmarEnvioCaficultor(solicitudId, loteId, guia.empresa, guia.numero);
    setSolicitudesHub(prev => prev.map(s => s.id === solicitudId
      ? { ...s, status: 'confirmada_caficultor', empresaCourier: guia.empresa, numeroGuia: guia.numero, confirmadoAt: new Date().toISOString() }
      : s
    ));
    setConfirmandoHub(null);
  }

  async function handleEnviarMuestraCert(certId: string) {
    const g = certGuiaForm[certId];
    if (!g?.empresa || !g?.numero) return;
    setEnviandoMuestraCert(certId);
    const cert = misCertificaciones.find(c => c.id === certId);
    await confirmarEnvioMuestraCertificacion(
      certId,
      g.empresa,
      g.numero,
      cert?.laboratorioId ?? '',
      cert?.nombreLote ?? certId,
    );
    setMisCertificaciones(prev => prev.map(c => c.id === certId
      ? { ...c, status: 'muestra_en_camino' as const, empresaCourierMuestra: g.empresa, numeroGuiaMuestra: g.numero }
      : c
    ));
    setEnviandoMuestraCert(null);
  }

  async function uploadToCloudinary(file: File, folder: string): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    form.append('folder', folder);
    const resourceType = file.type === 'application/pdf' ? 'raw' : 'image';
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
      { method: 'POST', body: form }
    );
    const data = await res.json();
    return data.secure_url;
  }

  async function handleFotoInline(loteId: string, file: File) {
    setSubiendoFoto(loteId);
    const url = await uploadToCloudinary(file, 'tunaywasi/lotes');
    await updateMktLoteFields(loteId, { fotoLoteUrl: url });
    setMisLotes(prev => prev.map(l => l.id === loteId ? { ...l, fotoLoteUrl: url } : l));
    setSubiendoFoto(null);
  }

  function abrirEdicion(lote: LoteDoc) {
    setEditForm({
      nombreLote: lote.nombreLote,
      precioOrigenPEN: String(lote.precioOrigenPEN),
      sacosDisponibles: String(lote.sacosDisponibles),
      variedad: lote.variedad,
      proceso: lote.proceso,
      altitud: lote.altitud.replace(' msnm', ''),
      cosecha: lote.cosecha,
      pesoPorSacoKg: String(lote.pesoPorSacoKg ?? 60),
      muestraDisponible: lote.muestraDisponible ? 'true' : 'false',
      stockMuestrasHub: String(lote.stockMuestrasHub ?? 0),
    });
    setEditandoLote(lote);
  }

  async function handleGuardarEdit() {
    if (!editandoLote) return;
    const peso = Number(editForm.pesoPorSacoKg);
    if (peso < 10 || peso > 70) return;
    setGuardandoEdit(true);
    const fields: Partial<LoteDoc> = {
      nombreLote: editForm.nombreLote,
      precioOrigenPEN: Number(editForm.precioOrigenPEN),
      sacosDisponibles: Number(editForm.sacosDisponibles),
      variedad: editForm.variedad,
      proceso: editForm.proceso as LoteDoc['proceso'],
      altitud: `${editForm.altitud} msnm`,
      cosecha: editForm.cosecha,
      pesoPorSacoKg: peso,
      muestraDisponible: editForm.muestraDisponible === 'true',
      stockMuestrasHub: Number(editForm.stockMuestrasHub) || 0,
    };
    await updateMktLoteFields(editandoLote.id, fields);
    setMisLotes(prev => prev.map(l => l.id === editandoLote.id ? { ...l, ...fields } : l));
    setGuardandoEdit(false);
    setEditandoLote(null);
  }

  async function handleArchivarLote(loteId: string) {
    if (!confirm('¿Archivar este lote? No será visible en el catálogo. Podrás recuperarlo desde el panel admin.')) return;
    setArchivando(loteId);
    await updateMktLoteFields(loteId, { status: 'agotado' });
    setMisLotes(prev => prev.map(l => l.id === loteId ? { ...l, status: 'agotado' } : l));
    setArchivando(null);
  }

  async function handlePublicarLote(loteId: string) {
    setPublicando(loteId);
    const lote = misLotes.find(l => l.id === loteId);
    if (!lote) { setPublicando(null); return; }
    // Calcular precio de venta: origen + comisión TW (sin flete — el flete se suma en el pedido)
    const comision = Math.round(lote.precioOrigenPEN * COMISION_TW);
    const precioVenta = lote.precioOrigenPEN + comision;
    // Flujo Uber: poner en_catacion, guardar precioVentaPEN y notificar a todos los labs activos
    await updateMktLoteFields(loteId, { status: 'en_catacion', publicadoAt: new Date().toISOString(), precioVentaPEN: precioVenta });
    await createSolicitudCertificacionAbierta(loteId, caficultor.uid, lote.nombreLote);
    // Solicitud automática de muestras al hub (3 unidades) — refrescar lista para que aparezca de inmediato
    await createSolicitudHub(loteId, caficultor.uid, 3).catch(() => {});
    fetchSolicitudesHub(caficultor.uid).then(setSolicitudesHub);
    setMisLotes(prev => prev.map(l => l.id === loteId ? { ...l, status: 'en_catacion', precioVentaPEN: precioVenta } : l));
    setPublicando(null);
  }

  async function handleEnviarSacos(pedidoId: string) {
    const g = guiaForm[pedidoId];
    if (!g?.empresa || !g?.numero) return;
    setEnviandoSacos(pedidoId);
    await confirmarEnvioPedido(pedidoId, g.empresa as PedidoB2BDoc['empresaTransporte'], g.numero);
    setMisPedidos(prev => prev.map(p => p.id === pedidoId
      ? { ...p, logisticaStatus: 'en_transito', empresaTransporte: g.empresa as PedidoB2BDoc['empresaTransporte'], numeroGuia: g.numero }
      : p));
    setEnviandoSacos(null);
  }

  async function handleGuardarCalificacion() {
    if (!modalCalifPedido) return;
    setGuardandoCalif(true);
    await crearCalificacion({
      pedidoId: modalCalifPedido.id,
      autorId: caficultor.uid,
      autorRol: 'caficultor',
      destinatarioId: modalCalifPedido.tostadoraId,
      destinatarioRol: 'cafeteria',
      puntaje: califPuntaje,
      ...(califComentario.trim() ? { comentario: califComentario.trim().slice(0, 300) } : {}),
    });
    setCalificacionesYaHechas(prev => new Set([...prev, modalCalifPedido.id]));
    setModalCalifPedido(null);
    setCalifPuntaje(5);
    setCalifComentario('');
    setGuardandoCalif(false);
  }

  async function handleSubmitLote() {
    setErrorLote(null);
    const pesoPorSaco = Number(loteForm.pesoPorSacoKg);
    if (pesoPorSaco < 10 || pesoPorSaco > 70) {
      setErrorLote('El peso por saco debe estar entre 10 kg y 70 kg.');
      return;
    }
    setGuardando(true);
    const precioOrigen = Number(loteForm.precioOrigenPEN);

    // Subir foto a Cloudinary si hay una seleccionada
    let fotoLoteUrl: string | undefined;
    if (fotoFile) {
      setUploadProgress(0);
      const form = new FormData();
      form.append('file', fotoFile);
      form.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      form.append('folder', 'tunaywasi/lotes');
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: form }
      );
      const data = await res.json();
      fotoLoteUrl = data.secure_url;
      setUploadProgress(null);
    }

    // Subir certificado existente a Cloudinary si hay uno
    let fichaCatacionUrl: string | undefined;
    if (certFile) {
      const formCert = new FormData();
      formCert.append('file', certFile);
      formCert.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      formCert.append('folder', 'tunaywasi/certificados');
      const certResourceType = certFile.type === 'application/pdf' ? 'raw' : 'image';
      const resCert = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/${certResourceType}/upload`,
        { method: 'POST', body: formCert }
      );
      const dataCert = await resCert.json();
      fichaCatacionUrl = dataCert.secure_url;
      setCertUrl(fichaCatacionUrl ?? null);
    }

    await createMktLote({
      caficultorId:       caficultor.uid,
      nombreLote:         loteForm.nombreLote,
      cosecha:            loteForm.cosecha,
      proceso:            loteForm.proceso as LoteDoc['proceso'],
      variedad:           loteForm.variedad,
      altitud:            `${loteForm.altitud} msnm`,
      region:             caficultor.region,
      puntajeReferencial: Number(loteForm.puntajeReferencial) || 0,
      notasSabor:         [],
      sacosDisponibles:   Number(loteForm.sacosDisponibles),
      pesoPorSacoKg:      Number(loteForm.pesoPorSacoKg) || 60,
      sacosReservados:    0,
      precioOrigenPEN:    precioOrigen,
      muestraDisponible:  loteForm.muestraDisponible === 'true',
      precioMuestraPEN:   15,
      stockMuestrasHub:   0,                                          // activado por admin al confirmar recepción hub
      cantidadMuestrasDeclarada: Number(loteForm.stockMuestrasHub) || 5,
      muestraEnCamino:    true,
      courierMuestrasHub: loteForm.courierMuestrasHub,
      ...(loteForm.guiaMuestrasHub ? { guiaMuestrasHub: loteForm.guiaMuestrasHub } : {}),
      status:             'borrador',
      destacado:          false,
      ...(fotoLoteUrl ? { fotoLoteUrl } : {}),
      ...(fichaCatacionUrl ? { fichaCatacionUrl } : {}),
    });
    setGuardando(false);
    setSubmitted(true);
  }

  const isMobile = useIsMobile();
  const inputStyle: React.CSSProperties = {
    ...mInputStyle,
    border: '1.5px solid #e0d8d0',
  };

  // Calcula precio estimado que recibirá el caficultor
  const precioOrigen = Number(loteForm.precioOrigenPEN) || 0;
  const comisionPlataforma = Math.round(precioOrigen * COMISION_TW);
  const precioFinal = precioOrigen + comisionPlataforma + FLETE_POR_SACO_PEN;

  // ── Render principal (modoEmbebido oculta header y nav propios) ─────────────
  if (false) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 24px' }}>
        {tab === 'mis_lotes' && (misLotes.length === 0 ? (
          <div style={{ background: `${C.terra}08`, border: `1px solid ${C.terra}30`, borderRadius: 14, padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>☕</div>
            <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: C.brown, marginBottom: 8 }}>
              Publica tu primer lote
            </h3>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 16px' }}>
              Son solo 3 campos: nombre del lote, precio por saco y cantidad disponible.
            </p>
            <button onClick={() => setTab('nuevo_lote')} style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '12px 28px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Publicar mi primer lote →
            </button>
          </div>
        ) : (
          <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setTab('nuevo_lote')} style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Publicar nuevo lote
            </button>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {misLotes.map(lote => {
              const info = STATUS_INFO[lote.status] ?? { label: lote.status, color: C.tan, desc: '' };
              const disponibles = lote.sacosDisponibles - lote.sacosReservados;
              return (
                <div key={lote.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>{lote.id} · {lote.cosecha}</p>
                      <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: 0 }}>{lote.nombreLote}</h3>
                    </div>
                    <span style={{ background: `${info.color}20`, color: info.color, fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>{info.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <div>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Precio/saco</p>
                      <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: 0, fontWeight: 700 }}>S/ {lote.precioOrigenPEN.toLocaleString()}</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Disponibles</p>
                      <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: 0, fontWeight: 700 }}>{disponibles} sacos</p>
                    </div>
                  </div>
                  {lote.status === 'borrador' && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handlePublicarLote(lote.id)}
                        disabled={publicando === lote.id}
                        style={{
                          background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                          padding: '9px 18px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                          cursor: publicando === lote.id ? 'not-allowed' : 'pointer',
                          opacity: publicando === lote.id ? 0.6 : 1,
                        }}
                      >
                        {publicando === lote.id ? 'Publicando...' : 'Publicar →'}
                      </button>
                    </div>
                  )}
                  {lote.status === 'publicado' && (
                    <div style={{ marginTop: 10 }}>
                      <button
                        onClick={async () => {
                          if (!confirm('¿Despublicar este lote?')) return;
                          setPublicando(lote.id);
                          await despublicarMktLote(lote.id);
                          setMisLotes(prev => prev.map(l => l.id === lote.id ? { ...l, status: 'borrador' } : l));
                          setPublicando(null);
                        }}
                        disabled={publicando === lote.id}
                        style={{
                          background: 'white', color: C.tan, border: `1px solid ${C.tan}`,
                          borderRadius: 8, padding: '7px 14px', fontFamily: 'Montserrat', fontSize: 12,
                          fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {publicando === lote.id ? 'Procesando...' : '↙ Despublicar'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </>
        ))}
        {tab === 'solicitudes' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>Mis muestras</h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24 }}>Cafeterías interesadas en tus lotes.</p>
            {solicitudes.length === 0 ? (
              <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan, textAlign: 'center', padding: '60px 0' }}>Aún no tienes solicitudes de muestra.</p>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {solicitudes.filter(s => s.status !== 'rechazada').map(sol => {
                  const lote = misLotes.find(l => l.id === sol.loteId);
                  return (
                    <div key={sol.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${sol.status === 'pendiente' ? C.terra : C.sage}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>{sol.id} · {new Date(sol.createdAt).toLocaleDateString('es-PE')}</p>
                          <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, color: C.brown, margin: '0 0 2px' }}>{lote?.nombreLote ?? sol.loteId}</h3>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0 }}>{sol.empresa} · {sol.nombreContacto}</p>
                        </div>
                        <span style={{ background: sol.status === 'pendiente' ? `${C.terra}20` : `${C.sage}20`, color: sol.status === 'pendiente' ? C.terra : C.sage, fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                          {sol.status === 'pendiente' ? 'Pendiente' : sol.status === 'despachada' ? 'Despachada ✓' : 'Recibida ✓'}
                        </span>
                      </div>
                      {sol.status === 'pendiente' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => { setDespachando(sol.id); updateMktSolicitudStatus(sol.id, 'despachada').then(() => { setSolicitudes(prev => prev.map(s => s.id === sol.id ? { ...s, status: 'despachada' } : s)); setDespachando(null); }); }} disabled={despachando === sol.id} style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: despachando === sol.id ? 'not-allowed' : 'pointer', opacity: despachando === sol.id ? 0.6 : 1 }}>
                            {despachando === sol.id ? 'Confirmando...' : 'Confirmar despacho →'}
                          </button>
                          <button onClick={() => { if (!confirm('¿Rechazar esta solicitud de muestra?')) return; updateMktSolicitudStatus(sol.id, 'rechazada').then(() => setSolicitudes(prev => prev.filter(s => s.id !== sol.id))); }} style={{ background: 'none', border: `1px solid ${C.tan}`, color: C.tan, borderRadius: 8, padding: '10px 16px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {tab === 'nuevo_lote' && !submitted && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>Publicar nuevo lote</h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24, lineHeight: 1.6 }}>Completa los datos de tu lote.</p>
            <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'grid', gap: 18 }}>
              <div><label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Nombre del lote *</label><input style={inputStyle} value={loteForm.nombreLote} onChange={e => setField('nombreLote', e.target.value)} placeholder="Ej: Finca San José — Geisha Honey Lote 01" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Variedad *</label><input style={inputStyle} value={loteForm.variedad} onChange={e => setField('variedad', e.target.value)} placeholder="Geisha, Caturra..." /></div>
                <div><label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Proceso *</label><select style={inputStyle} value={loteForm.proceso} onChange={e => setField('proceso', e.target.value)}><option value="lavado">Lavado</option><option value="natural">Natural</option><option value="honey">Honey</option><option value="anaerobico">Anaeróbico</option><option value="doble_fermentacion">Doble fermentación</option></select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Altitud (msnm) *</label><input style={inputStyle} type="number" value={loteForm.altitud} onChange={e => setField('altitud', e.target.value)} placeholder="1800" /></div>
                <div><label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Cosecha *</label><input style={inputStyle} value={loteForm.cosecha} onChange={e => setField('cosecha', e.target.value)} placeholder="Junio 2026" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div><label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Sacos disponibles *</label><input style={inputStyle} type="number" value={loteForm.sacosDisponibles} onChange={e => setField('sacosDisponibles', e.target.value)} placeholder="10" min={1} /></div>
                <div><label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Kg por saco *</label><input style={inputStyle} type="number" value={loteForm.pesoPorSacoKg} onChange={e => setField('pesoPorSacoKg', e.target.value)} placeholder="60" min={1} max={70} /></div>
                <div><label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Precio mínimo/saco (S/) *</label><input style={inputStyle} type="number" value={loteForm.precioOrigenPEN} onChange={e => setField('precioOrigenPEN', e.target.value)} placeholder="850" min={100} /></div>
              </div>
              {/* Hub Lima — muestras de 200g */}
              <div style={{ background: '#f5f9ff', border: '1px solid #8a6fc930', borderRadius: 10, padding: 16 }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: '#8a6fc9', margin: '0 0 10px' }}>📦 Muestras al hub Lima (200g c/u)</p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: '0 0 12px', lineHeight: 1.5 }}>
                  Envía muestras de 200g a nuestro hub en Lima. Las cafeterías podrán recibirlas antes de comprar sacos.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Cantidad de muestras *</label>
                    <input style={inputStyle} type="number" value={loteForm.stockMuestrasHub} onChange={e => setField('stockMuestrasHub', e.target.value)} placeholder="5" min={1} max={50} />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Courier *</label>
                    <select style={inputStyle} value={loteForm.courierMuestrasHub} onChange={e => setField('courierMuestrasHub', e.target.value)}>
                      <option value="Shalom">Shalom</option>
                      <option value="Olva">Olva</option>
                      <option value="Cruz del Sur">Cruz del Sur</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>N° de guía</label>
                    <input style={inputStyle} value={loteForm.guiaMuestrasHub} onChange={e => setField('guiaMuestrasHub', e.target.value)} placeholder="SHL-XXXXXX" />
                  </div>
                </div>
              </div>
              <button style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '14px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (!loteForm.nombreLote || !loteForm.variedad || !loteForm.precioOrigenPEN || guardando) ? 0.5 : 1 }} onClick={handleSubmitLote} disabled={!loteForm.nombreLote || !loteForm.variedad || !loteForm.precioOrigenPEN || guardando}>
                {guardando ? 'Guardando...' : 'Registrar lote →'}
              </button>
              {errorLote && <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#c0392b', margin: '8px 0 0' }}>{errorLote}</p>}
            </div>
          </div>
        )}
        {tab === 'nuevo_lote' && submitted && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🌱</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 8 }}>¡Lote registrado!</h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, lineHeight: 1.7, maxWidth: 440, margin: '0 auto 20px' }}>Tu lote está guardado como borrador. Publícalo desde "Mis lotes".</p>
            <button onClick={() => { setSubmitted(false); setTab('mis_lotes'); }} style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '12px 28px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Ver mis lotes →
            </button>
          </div>
        )}
        {tab === 'mis_pagos' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>Mis pagos</h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24, lineHeight: 1.6 }}>Pagos de tus pedidos entregados.</p>
            {misPedidos.filter(p => p.pagoCaficultorStatus === 'pagado' || p.logisticaStatus === 'entregado').length === 0 ? (
              <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan, textAlign: 'center', padding: '60px 0' }}>Aún no tienes pagos registrados.</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {misPedidos.filter(p => p.logisticaStatus === 'entregado' || p.pagoCaficultorStatus === 'pagado').map(ped => {
                  const lote = misLotes.find(l => l.id === ped.loteId);
                  return (
                    <div key={ped.id} style={{ background: 'white', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${ped.pagoCaficultorStatus === 'pagado' ? C.sage : C.terra}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>{ped.id} · {lote?.nombreLote ?? ped.loteId}</p>
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: ped.pagoCaficultorStatus === 'pagado' ? C.sage : C.terra, margin: 0, fontWeight: 600 }}>{ped.pagoCaficultorStatus === 'pagado' ? `Pagado ✓${ped.pagoCaficultorAt ? ' · ' + new Date(ped.pagoCaficultorAt).toLocaleDateString('es-PE') : ''}` : 'Pago en proceso (máx. 48h hábiles)'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, color: ped.pagoCaficultorStatus === 'pagado' ? C.sage : C.terra, margin: 0 }}>S/ {ped.montoCaficultorPEN.toLocaleString()}</p>
                      </div>
                      </div>
                      {ped.logisticaStatus === 'entregado' && !calificacionesYaHechas.has(ped.id) && (
                        <div style={{ marginTop: 10, borderTop: '1px solid #f0ebe4', paddingTop: 10 }}>
                          <button
                            onClick={() => { setModalCalifPedido(ped); setCalifPuntaje(5); setCalifComentario(''); }}
                            style={{ background: 'none', border: `1px solid ${C.terra}`, color: C.terra, borderRadius: 8, padding: '6px 14px', fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          >
                            ★ Calificar cafetería
                          </button>
                        </div>
                      )}
                      {ped.logisticaStatus === 'entregado' && calificacionesYaHechas.has(ped.id) && (
                        <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.sage, margin: '8px 0 0' }}>✓ Ya calificaste esta cafetería</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {tab === 'perfil' && (
          <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: 560 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.terra, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, fontFamily: 'Cormorant Garamond', color: 'white', flexShrink: 0 }}>{caficultor.nombre.charAt(0).toUpperCase()}</div>
                <div><h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: 0 }}>{caficultor.nombre}</h2><p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '2px 0 0' }}>{caficultor.email}</p></div>
              </div>
              <button onClick={onLogout} title="Cerrar sesión" style={{ background: 'none', border: 'none', borderRadius: 10, padding: '8px', cursor: 'pointer', color: C.tan, lineHeight: 1, flexShrink: 0, opacity: 0.7, transition: 'opacity 0.15s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {([{ key: 'nombre', label: 'Nombre completo' }, { key: 'finca', label: 'Nombre de la finca' }, { key: 'region', label: 'Región / departamento' }, { key: 'telefono', label: 'Teléfono' }] as { key: keyof typeof perfilForm; label: string }[]).map(({ key, label }) => (
                <div key={key}><label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>{label}</label><input style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, background: 'white', boxSizing: 'border-box' }} value={perfilForm[key]} onChange={e => setPerfilForm(f => ({ ...f, [key]: e.target.value }))} /></div>
              ))}
              {perfilGuardado && <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.sage, margin: 0 }}>✓ Perfil actualizado correctamente.</p>}
              <button onClick={async () => { setGuardandoPerfil(true); setPerfilGuardado(false); await updatePerfil(caficultor.uid, { nombre: perfilForm.nombre, finca: perfilForm.finca, region: perfilForm.region, ...(perfilForm.telefono ? { telefono: perfilForm.telefono } : {}) }); setGuardandoPerfil(false); setPerfilGuardado(true); }} disabled={guardandoPerfil || !perfilForm.nombre || !perfilForm.finca || !perfilForm.region} style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '12px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: (guardandoPerfil || !perfilForm.nombre || !perfilForm.finca || !perfilForm.region) ? 'not-allowed' : 'pointer', opacity: (guardandoPerfil || !perfilForm.nombre || !perfilForm.finca || !perfilForm.region) ? 0.5 : 1 }}>
                {guardandoPerfil ? 'Guardando...' : 'Guardar cambios →'}
              </button>
            </div>
          </div>
        )}
        {/* Modales */}
        {/* Modal perfil cafetería */}
        {modalCafeteria && (() => { const ped = modalCafeteria!; const califs = modalCafeteriaCalifs; const califsLoaded = califs !== null; return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: 0 }}>Perfil cafetería</h3>
                <button onClick={() => setModalCafeteria(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.tan }}>✕</button>
              </div>
              <p style={{ fontFamily: 'Montserrat', fontSize: 15, fontWeight: 700, color: C.brown, margin: '0 0 4px' }}>{ped.razonSocial}</p>
              <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 16px' }}>RUC {ped.ruc}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
                <div style={{ background: '#f5f9ff', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Montserrat', fontSize: 20, fontWeight: 700, color: '#8a6fc9' }}>
                    {!califsLoaded ? '…'
                      : califs!.total === 0 ? '—'
                      : califs!.promedio.toFixed(1)}
                  </div>
                  <div style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, marginTop: 2 }}>
                    {!califsLoaded ? '' : califs!.total === 0 ? 'Sin reseñas' : `★ ${califs!.total} reseña${califs!.total !== 1 ? 's' : ''}`}
                  </div>
                </div>
                <div style={{ background: '#f5f9f5', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Montserrat', fontSize: 20, fontWeight: 700, color: C.sage }}>
                    {modalCafeteriaPedidos === null ? '…' : modalCafeteriaPedidos}
                  </div>
                  <div style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, marginTop: 2 }}>Pedidos completados</div>
                </div>
              </div>
              <button onClick={() => setModalCafeteria(null)} style={{ width: '100%', background: '#f5f0ea', color: C.brown, border: 'none', borderRadius: 8, padding: '12px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 18 }}>
                Cerrar
              </button>
            </div>
          </div>
        ); })()}
        {/* Modal calificación cafetería */}
        {modalCalifPedido && (() => { const ped = modalCalifPedido!; return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: 0 }}>Calificar cafetería</h3>
                <button onClick={() => setModalCalifPedido(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.tan }}>✕</button>
              </div>
              <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 16px' }}>Pedido {ped.id}</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {([1,2,3,4,5] as const).map(n => (
                  <button key={n} onClick={() => setCalifPuntaje(n)} style={{
                    fontSize: 26, background: 'none', border: 'none', cursor: 'pointer',
                    opacity: califPuntaje >= n ? 1 : 0.25,
                  }}>★</button>
                ))}
              </div>
              <textarea
                value={califComentario}
                onChange={e => setCalifComentario(e.target.value.slice(0, 300))}
                placeholder="Comentario opcional (máx. 300 caracteres)"
                rows={3}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 12, color: C.brown, resize: 'none', boxSizing: 'border-box', marginBottom: 16 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setModalCalifPedido(null)} style={{ flex: 1, background: '#f5f0ea', color: C.brown, border: 'none', borderRadius: 8, padding: '12px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleGuardarCalificacion} disabled={guardandoCalif} style={{ flex: 1, background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '12px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: guardandoCalif ? 'not-allowed' : 'pointer', opacity: guardandoCalif ? 0.6 : 1 }}>
                  {guardandoCalif ? 'Guardando...' : 'Enviar calificación →'}
                </button>
              </div>
            </div>
          </div>
        ); })()}
        {editandoLote && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: 0 }}>Editar lote</h3>
                <button onClick={() => setEditandoLote(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.tan }}>✕</button>
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                <div><label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Nombre del lote</label><input style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }} value={editForm.nombreLote} onChange={e => setEditForm(f => ({ ...f, nombreLote: e.target.value }))} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div><label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Sacos</label><input type="number" min={1} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }} value={editForm.sacosDisponibles} onChange={e => setEditForm(f => ({ ...f, sacosDisponibles: e.target.value }))} /></div>
                  <div><label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Kg/saco</label><input type="number" min={10} max={70} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }} value={editForm.pesoPorSacoKg} onChange={e => setEditForm(f => ({ ...f, pesoPorSacoKg: e.target.value }))} /></div>
                  <div><label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Precio/saco (S/)</label><input type="number" min={100} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }} value={editForm.precioOrigenPEN} onChange={e => setEditForm(f => ({ ...f, precioOrigenPEN: e.target.value }))} /></div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setEditandoLote(null)} style={{ flex: 1, background: 'none', border: `1px solid ${C.tan}`, borderRadius: 8, padding: '11px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 600, color: C.tan, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={handleGuardarEdit} disabled={guardandoEdit} style={{ flex: 2, background: C.terra, border: 'none', borderRadius: 8, padding: '11px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: 'white', cursor: guardandoEdit ? 'not-allowed' : 'pointer', opacity: guardandoEdit ? 0.6 : 1 }}>{guardandoEdit ? 'Guardando...' : 'Guardar cambios'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: '#f7f3ee', minHeight: '100vh' }}>

      {/* Header caficultor */}
      {!modoEmbebido && <div style={{ background: C.green, padding: `${isMobile ? 16 : 28}px ${padX(isMobile)}px`, color: C.cream }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: isMobile ? 44 : 52, height: isMobile ? 44 : 52, borderRadius: '50%', background: C.terra, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.sage}`, fontSize: isMobile ? 18 : 22, fontWeight: 700, fontFamily: 'Cormorant Garamond', color: 'white', flexShrink: 0 }}>
                {caficultor.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, letterSpacing: 2, margin: '0 0 2px', textTransform: 'uppercase' }}>
                  Portal del caficultor
                </p>
                <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: isMobile ? 18 : 22, margin: 0 }}>
                  Hola, {caficultor.nombre}
                </h2>
                {!isMobile && <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0 }}>
                  Finca {caficultor.finca} · {caficultor.region}
                </p>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <NotifBell uid={caficultor.uid} />
              <button
                onClick={onLogout}
                style={{
                  background: 'transparent', color: C.tan, border: `1px solid ${C.tan}40`,
                  borderRadius: 8, padding: '8px 14px', fontFamily: 'Montserrat',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                {isMobile ? 'Salir' : 'Cerrar sesión'}
              </button>
            </div>
          </div>

          {/* Mini stats */}
          <div style={{ display: 'flex', gap: isMobile ? 20 : 28, marginTop: isMobile ? 14 : 20 }}>
            {[
              { n: misLotes.length, label: 'lotes registrados' },
              { n: misLotes.filter(l => l.status === 'publicado').length, label: 'activos en venta' },
              { n: misPedidos.filter(p => p.pagoStatus === 'verificado' && p.logisticaStatus === 'en_origen').length, label: 'pedidos por despachar', alert: true },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, color: ('alert' in s && s.alert && s.n > 0) ? C.terra : C.cream }}>{s.n}</div>
                <div style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>}

      {/* Tabs — top en desktop, bottom en móvil */}
      {!modoEmbebido && (
        <div style={isMobile ? tabBarStyle(true) : { background: 'white', borderBottom: '1px solid #eee', padding: '0 16px', overflowX: 'auto' }}>
          <div style={isMobile ? { display: 'contents' } : { maxWidth: 700, margin: '0 auto', display: 'flex' }}>
            {([
              { key: 'mis_lotes',   label: 'Lotes',       icon: '📋' },
              { key: 'solicitudes', label: 'Muestras',    icon: '📦', badge: solicitudes.filter(s => s.status === 'pendiente').length + solicitudesHub.filter(s => s.status === 'solicitada').length },
              { key: 'mis_pagos',  label: 'Pagos',        icon: '💰', badge: misPedidos.filter(p => p.logisticaStatus === 'entregado' && p.pagoCaficultorStatus === 'pendiente').length },
              { key: 'perfil',     label: 'Mi perfil',    icon: '👤' },
            ] as { key: Tab; label: string; icon: string; badge?: number }[]).map(t => (
              <button key={t.key} id={`tab-caficultor-${t.key.replace(/_/g, '-')}`} onClick={() => setTab(t.key)}
                style={tabBtn(tab === t.key, isMobile, C.terra)}>
                {isMobile ? (
                  <>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</span>
                    <span>{t.label}</span>
                    {(t.badge ?? 0) > 0 && (
                      <span style={{ position: 'absolute', top: 6, right: 'calc(50% - 18px)', background: C.terra, color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.badge}</span>
                    )}
                  </>
                ) : (
                  <>
                    {t.label}
                    {(t.badge ?? 0) > 0 && (
                      <span style={{ background: C.terra, color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{t.badge}</span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 700, margin: '0 auto', padding: `${padY(isMobile)}px ${padX(isMobile)}px`, paddingBottom: isMobile && !modoEmbebido ? 90 : padY(isMobile) }}>

        {/* MIS LOTES */}
        {tab === 'mis_lotes' && (
          <div>
            {/* Sub-tab bar */}
            {(() => {
              const nDespachar = misPedidos.filter(p => p.pagoStatus === 'verificado' && p.logisticaStatus === 'en_origen').length;
              return (
                <div style={{ display: 'flex', borderBottom: `2px solid ${C.tan}30`, marginBottom: 24, gap: 2 }}>
                  {([
                    { key: 'lotes' as const,     label: 'Mis lotes',            badge: 0 },
                    { key: 'despachar' as const, label: 'Por despachar', badge: nDespachar },
                  ]).map(st => (
                    <button key={st.key} onClick={() => setSubTabMisLotes(st.key)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: subTabMisLotes === st.key ? 700 : 400,
                      color: subTabMisLotes === st.key ? C.terra : C.tan,
                      borderBottom: `3px solid ${subTabMisLotes === st.key ? C.terra : 'transparent'}`,
                      marginBottom: -2, display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {st.label}
                      {st.badge > 0 && (
                        <span style={{ background: C.terra, color: 'white', fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '1px 6px', borderRadius: 20 }}>
                          {st.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* ── Sub-tab: Por despachar ────────────────────────────────── */}
            {subTabMisLotes === 'despachar' && (
              <div>
                {misPedidos.filter(p => p.pagoStatus === 'verificado' && p.logisticaStatus === 'en_origen').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan }}>No hay pedidos pendientes de despacho.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                  {misPedidos.filter(p => p.pagoStatus === 'verificado' && p.logisticaStatus === 'en_origen').map(ped => {
                    const lote = misLotes.find(l => l.id === ped.loteId);
                    const lab = lote?.laboratorioId ? laboratorios.find(l => l.id === lote.laboratorioId) : null;
                    const isEnviando = enviandoSacos === ped.id;
                    return (
                      <div key={ped.id} style={{
                        background: 'white', borderRadius: 12, padding: 20,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        borderLeft: `4px solid ${C.terra}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>
                              {ped.id} · {new Date(ped.createdAt).toLocaleDateString('es-PE')}
                            </p>
                            <h4 style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, color: C.brown, margin: 0 }}>
                              {lote?.nombreLote ?? ped.loteId}
                            </h4>
                          </div>
                          <span style={{
                            background: `${C.terra}20`, color: C.terra,
                            fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700,
                            padding: '4px 10px', borderRadius: 20,
                          }}>
                            Pago verificado ✓
                          </span>
                        </div>

                        <div style={{ ...grid3(isMobile), marginBottom: 14 }}>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Sacos</p>
                            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: 0, fontWeight: 700 }}>{ped.sacosSolicitados}</p>
                          </div>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Peso total</p>
                            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: 0, fontWeight: 700 }}>{ped.kgTotal} kg</p>
                          </div>
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Tu pago</p>
                            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.sage, margin: 0, fontWeight: 700 }}>S/ {ped.montoCaficultorPEN.toLocaleString()}</p>
                          </div>
                        </div>

                        {lab ? (
                          <div style={{ background: '#fffbf5', border: `1px solid ${C.terra}40`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.terra, margin: '0 0 6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Envía al laboratorio para tueste
                            </p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: '0 0 2px', fontWeight: 700 }}>
                              {lab.nombreComercial}
                            </p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 2px' }}>
                              {lab.direccion}
                            </p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: '0 0 8px' }}>
                              Contacto: {lab.contactoNombre} · {lab.telefono}
                            </p>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: 0, fontStyle: 'italic' }}>
                              El laboratorio tueste y entrega al comprador ({ped.razonSocial}).
                            </p>
                          </div>
                        ) : (
                          <div style={{ background: '#fffbf5', border: `1px solid ${C.tan}40`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Envía directamente al comprador
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, margin: '0 0 2px', fontWeight: 700 }}>
                                  {ped.razonSocial}
                                </p>
                                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 2px' }}>
                                  {ped.direccionEntrega}
                                </p>
                                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
                                  Contacto: {ped.contacto} · {ped.telefono}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setModalCafeteria(ped);
                                  setModalCafeteriaCalifs(null);
                                  setModalCafeteriaPedidos(null);
                                  fetchCalificacionesByDestinatario(ped.tostadoraId).then(cals => {
                                    const calsCaf = cals.filter(c => c.destinatarioRol === 'cafeteria');
                                    setModalCafeteriaCalifs(calsCaf.length > 0
                                      ? { promedio: calsCaf.reduce((s, c) => s + c.puntaje, 0) / calsCaf.length, total: calsCaf.length }
                                      : { promedio: 0, total: 0 });
                                  });
                                  fetchMktPedidosByTostadora(ped.tostadoraId).then(peds => {
                                    setModalCafeteriaPedidos(peds.filter(p => p.pagoStatus === 'verificado').length);
                                  });
                                }}
                                style={{ background: 'none', border: `1px solid ${C.tan}`, color: C.tan, borderRadius: 8, padding: '4px 10px', fontFamily: 'Montserrat', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 8 }}
                              >
                                Ver perfil
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Formulario de envío */}
                        <div style={{ ...grid2(isMobile), marginBottom: 12 }}>
                          <div>
                            <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Empresa transportista *
                            </label>
                            <select
                              value={guiaForm[ped.id]?.empresa ?? ''}
                              onChange={e => setGuiaForm(prev => ({ ...prev, [ped.id]: { ...prev[ped.id], empresa: e.target.value, numero: prev[ped.id]?.numero ?? '' } }))}
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, background: 'white' }}
                            >
                              <option value=''>Seleccionar...</option>
                              <option value='Shalom'>Shalom</option>
                              <option value='Olva'>Olva Courier</option>
                              <option value='Cruz del Sur'>Cruz del Sur</option>
                              <option value='Otro'>Otro</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Número de guía *
                            </label>
                            <input
                              value={guiaForm[ped.id]?.numero ?? ''}
                              onChange={e => setGuiaForm(prev => ({ ...prev, [ped.id]: { ...prev[ped.id], numero: e.target.value, empresa: prev[ped.id]?.empresa ?? '' } }))}
                              placeholder='SHL-2026-XXXXXXX'
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, background: 'white', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleEnviarSacos(ped.id)}
                          disabled={isEnviando || !guiaForm[ped.id]?.empresa || !guiaForm[ped.id]?.numero}
                          style={{
                            background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                            padding: '10px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                            cursor: (isEnviando || !guiaForm[ped.id]?.empresa || !guiaForm[ped.id]?.numero) ? 'not-allowed' : 'pointer',
                            opacity: (isEnviando || !guiaForm[ped.id]?.empresa || !guiaForm[ped.id]?.numero) ? 0.5 : 1,
                          }}
                        >
                          {isEnviando ? 'Confirmando...' : 'Confirmar envío de sacos →'}
                        </button>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )}

            {/* ── Sub-tab: Mis lotes ───────────────────────────────────── */}
            {subTabMisLotes === 'lotes' && (
              <div>
            {misLotes.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={() => setTab('nuevo_lote')} style={{ background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  + Publicar nuevo lote
                </button>
              </div>
            )}
            {misLotes.length === 0 ? (
              <div style={{ background: `${C.terra}08`, border: `1px solid ${C.terra}30`, borderRadius: 14, padding: '32px 28px', marginBottom: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>☕</div>
                <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, color: C.brown, marginBottom: 8 }}>
                  Publica tu primer lote
                </h3>
                <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, lineHeight: 1.7, marginBottom: 4, maxWidth: 420, margin: '0 auto 16px' }}>
                  Son solo 3 campos: nombre del lote, precio por saco y cantidad disponible.<br />
                  Las cafeterías lo verán inmediatamente en el catálogo.
                </p>
                <button
                  onClick={() => setTab('nuevo_lote')}
                  style={{
                    background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                    padding: '12px 28px', fontFamily: 'Montserrat', fontSize: 13,
                    fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Publicar mi primer lote →
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {/* Filtros de estado */}
                {(() => {
                  const FILTROS: { key: typeof filtroLotes; label: string; count: number }[] = [
                    { key: 'todos', label: 'Todos', count: misLotes.length },
                    { key: 'publicado', label: 'Publicados', count: misLotes.filter(l => l.status === 'publicado').length },
                    { key: 'borrador', label: 'Borradores', count: misLotes.filter(l => l.status === 'borrador').length },
                    { key: 'archivado', label: 'Archivados', count: misLotes.filter(l => ['agotado','rechazado'].includes(l.status)).length },
                  ];
                  return (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      {FILTROS.map(f => (
                        <button key={f.key} onClick={() => setFiltroLotes(f.key)}
                          style={{
                            background: filtroLotes === f.key ? C.terra : 'white',
                            color: filtroLotes === f.key ? 'white' : C.tan,
                            border: `1px solid ${filtroLotes === f.key ? C.terra : '#ddd'}`,
                            borderRadius: 20, padding: '5px 14px',
                            fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer',
                          }}>
                          {f.label} <span style={{ opacity: 0.7 }}>({f.count})</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
                {misLotes.filter(lote => {
                  if (filtroLotes === 'todos') return true;
                  if (filtroLotes === 'borrador') return lote.status === 'borrador';
                  if (filtroLotes === 'publicado') return lote.status === 'publicado';
                  if (filtroLotes === 'archivado') return ['agotado','rechazado'].includes(lote.status);
                  return true;
                }).map(lote => {
                  const info = STATUS_INFO[lote.status];
                  const disponibles = lote.sacosDisponibles - lote.sacosReservados;
                  const ingresosEstimados = lote.sacosReservados * (lote.precioOrigenPEN);
                  return (
                    <div key={lote.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {lote.id} · {lote.cosecha}
                          </p>
                          <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: 0 }}>
                            {lote.nombreLote}
                          </h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            background: `${info.color}20`, color: info.color,
                            fontSize: 11, fontFamily: 'Montserrat', fontWeight: 700,
                            padding: '4px 10px', borderRadius: 20,
                          }}>
                            {info.label}
                          </span>
                          <button
                            onClick={() => abrirEdicion(lote)}
                            title="Editar lote"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.tan, padding: 4 }}
                          >✏️</button>
                          <button
                            onClick={() => handleArchivarLote(lote.id)}
                            disabled={archivando === lote.id}
                            title="Archivar lote"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.tan, padding: 4 }}
                          >🗄️</button>
                        </div>
                      </div>

                      <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, marginBottom: 14 }}>
                        {info.desc}
                      </p>

                      {/* Barra de progreso de sacos */}
                      {lote.sacosDisponibles > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>
                              {lote.sacosReservados} reservados / {lote.sacosDisponibles} total
                            </span>
                            <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.sage }}>
                              {disponibles} disponibles
                            </span>
                          </div>
                          <div style={{ background: '#f0ebe4', borderRadius: 4, height: 8 }}>
                            <div style={{
                              background: C.terra, borderRadius: 4, height: 8,
                              width: `${(lote.sacosReservados / lote.sacosDisponibles) * 100}%`,
                              transition: 'width 0.5s',
                            }} />
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 20 }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Tu precio/saco</p>
                          <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.brown, margin: 0, fontWeight: 700 }}>
                            S/ {lote.precioOrigenPEN.toLocaleString()}
                          </p>
                        </div>
                        {ingresosEstimados > 0 && (
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Ingresos estimados</p>
                            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.sage, margin: 0, fontWeight: 700 }}>
                              S/ {ingresosEstimados.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {lote.puntajeOficial && (
                          <div>
                            <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Puntaje Q-Grader</p>
                            <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, color: C.terra, margin: 0, fontWeight: 700 }}>
                              {lote.puntajeOficial} pts SCA
                            </p>
                          </div>
                        )}
                      </div>

                      {lote.status === 'borrador' && (() => {
                        const faltaFoto = !lote.fotoLoteUrl;
                        return (
                          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid #eee`, display: 'grid', gap: 10 }}>
                            {/* Botones de completar */}
                            {faltaFoto && (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {faltaFoto && (
                                  <>
                                    <input
                                      type="file" accept="image/jpeg,image/png,image/webp"
                                      style={{ display: 'none' }}
                                      ref={el => { fotoInputRefs.current[lote.id] = el; }}
                                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFotoInline(lote.id, f); }}
                                    />
                                    <button
                                      onClick={() => fotoInputRefs.current[lote.id]?.click()}
                                      disabled={subiendoFoto === lote.id}
                                      style={{ background: 'white', border: `1px solid ${C.tan}`, borderRadius: 7, padding: '7px 14px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600, color: C.brown, cursor: 'pointer' }}
                                    >
                                      {subiendoFoto === lote.id ? 'Subiendo...' : '📷 Agregar foto'}
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                              <button
                                onClick={() => handlePublicarLote(lote.id)}
                                disabled={publicando === lote.id}
                                style={{
                                  background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                                  padding: '10px 20px', fontFamily: 'Montserrat', fontSize: 13,
                                  fontWeight: 700, cursor: publicando === lote.id ? 'not-allowed' : 'pointer',
                                  opacity: publicando === lote.id ? 0.6 : 1,
                                }}
                              >
                                {publicando === lote.id ? 'Publicando...' : 'Publicar →'}
                              </button>
                              <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, fontStyle: 'italic' }}>
                                Al publicar, el sistema asigna un laboratorio certificado automáticamente.
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {lote.status === 'en_catacion' && (
                        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid #eee` }}>
                          <div style={{ background: '#f3e8ff', border: '1px solid #8a6fc940', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 20 }}>🔬</span>
                            <div>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, color: '#8a6fc9', margin: '0 0 3px' }}>
                                Certificación en curso
                              </p>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0 }}>
                                El sistema notificó a los laboratorios disponibles. Si el puntaje SCA supera el umbral, tu lote se publica automáticamente en el catálogo.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {lote.status === 'publicado' && (
                        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid #eee` }}>
                          <button
                            onClick={async () => {
                              if (!confirm('¿Despublicar este lote? Dejará de aparecer en el marketplace. Puedes volver a publicarlo cuando quieras.')) return;
                              setPublicando(lote.id);
                              await despublicarMktLote(lote.id);
                              setMisLotes(prev => prev.map(l => l.id === lote.id ? { ...l, status: 'borrador' } : l));
                              setPublicando(null);
                            }}
                            disabled={publicando === lote.id}
                            style={{
                              background: 'white', color: C.tan, border: `1px solid ${C.tan}`,
                              borderRadius: 8, padding: '8px 16px', fontFamily: 'Montserrat', fontSize: 12,
                              fontWeight: 600, cursor: publicando === lote.id ? 'not-allowed' : 'pointer',
                              opacity: publicando === lote.id ? 0.6 : 1,
                            }}
                          >
                            {publicando === lote.id ? 'Procesando...' : '↙ Despublicar'}
                          </button>
                          {lote.catado && (
                            <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.sage, marginLeft: 12, fontWeight: 600 }}>
                              ✓ Catado · {lote.puntajeOficial} pts SCA
                            </span>
                          )}
                        </div>
                      )}

                      {/* Pedidos de este lote */}
                      {misPedidos.filter(p => p.loteId === lote.id).length > 0 && (
                        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid #eee` }}>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
                            Pedidos
                          </p>
                          <div style={{ display: 'grid', gap: 6 }}>
                            {misPedidos.filter(p => p.loteId === lote.id).map(ped => {
                              const logLabel: Record<string, string> = {
                                pendiente_pago: 'Esperando pago',
                                en_origen: 'Pago verificado — despachar',
                                en_transito: 'En tránsito a Lima',
                                en_almacen: 'En almacén Lima',
                                entregado: 'Entregado ✓',
                                cancelado: 'Cancelado',
                              };
                              const logColor: Record<string, string> = {
                                pendiente_pago: C.tan,
                                en_origen: C.terra,
                                en_transito: '#d6b15a',
                                en_almacen: '#d6b15a',
                                entregado: C.sage,
                                cancelado: '#aaa',
                              };
                              const st = ped.logisticaStatus as string;
                              return (
                                <div key={ped.id} style={{
                                  background: '#f7f3ee', borderRadius: 8, padding: '8px 12px',
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <span style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 600, color: C.brown }}>{ped.id}</span>
                                      <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, marginLeft: 8 }}>
                                        {ped.sacosSolicitados} sacos · S/ {ped.montoCaficultorPEN.toLocaleString()}
                                      </span>
                                    </div>
                                    <span style={{
                                      fontFamily: 'Montserrat', fontSize: 10, fontWeight: 700,
                                      color: logColor[st] ?? C.tan,
                                    }}>
                                      {logLabel[st] ?? st}
                                    </span>
                                  </div>
                                  {ped.logisticaStatus === 'entregado' && (
                                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{
                                        fontFamily: 'Montserrat', fontSize: 10, fontWeight: 700,
                                        background: ped.pagoCaficultorStatus === 'pagado' ? `${C.sage}25` : `${C.terra}15`,
                                        color: ped.pagoCaficultorStatus === 'pagado' ? C.sage : C.terra,
                                        padding: '2px 8px', borderRadius: 20,
                                      }}>
                                        {ped.pagoCaficultorStatus === 'pagado'
                                          ? `Pago recibido ✓${ped.pagoCaficultorAt ? ' · ' + new Date(ped.pagoCaficultorAt).toLocaleDateString('es-PE') : ''}`
                                          : 'Pago pendiente — en proceso'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
              </div>
            )}
          </div>
        )}
        {tab === 'solicitudes' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 16 }}>
              Mis muestras
            </h2>

            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: `1px solid #ede8e0`, paddingBottom: 0 }}>
              {([
                { key: 'hub_lima' as const,      label: 'Hub Lima',       badge: solicitudesHub.filter(s => s.status === 'solicitada').length },
                { key: 'certificacion' as const, label: 'Certificación',  badge: misCertificaciones.filter(c => c.status === 'aceptada' || c.status === 'muestra_en_camino').length },
              ]).map(t => (
                <button key={t.key} onClick={() => setSubTabSolicitudes(t.key)} style={{
                  background: 'none', border: 'none',
                  borderBottom: `3px solid ${subTabSolicitudes === t.key ? C.terra : 'transparent'}`,
                  padding: '10px 16px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                  color: subTabSolicitudes === t.key ? C.terra : C.tan,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: -1,
                }}>
                  {t.label}
                  {t.badge > 0 && (
                    <span style={{ background: C.terra, color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20 }}>
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Sub-tab: Hub Lima */}
            {subTabSolicitudes === 'hub_lima' && (
              <div>
                {solicitudesHub.filter(s => s.status === 'solicitada' || s.status === 'confirmada_caficultor').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan }}>Sin solicitudes del hub por ahora.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {solicitudesHub.filter(s => s.status === 'solicitada' || s.status === 'confirmada_caficultor').map(sol => {
                      const lote = misLotes.find(l => l.id === sol.loteId);
                      const expira = new Date(sol.expiraAt);
                      const horasRestantes = Math.max(0, Math.floor((expira.getTime() - Date.now()) / 3600000));
                      const guia = hubGuiaForm[sol.id] ?? { empresa: '', numero: '' };
                      return (
                        <div key={sol.id} style={{ background: 'white', borderRadius: 12, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${sol.status === 'confirmada_caficultor' ? C.sage : C.terra}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <div>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>Hub Lima</p>
                              <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, color: C.brown, margin: 0, fontWeight: 700 }}>{lote?.nombreLote ?? sol.loteId}</p>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '2px 0 0' }}>
                                {sol.cantidadSolicitada} muestra{sol.cantidadSolicitada > 1 ? 's' : ''} de 200g · <strong style={{ color: C.brown }}>Jr. Ucayali 850, Lima — Tunay Wasi</strong>
                              </p>
                            </div>
                            {sol.status === 'confirmada_caficultor' ? (
                              <span style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.sage, background: `${C.sage}15`, padding: '4px 10px', borderRadius: 20 }}>✓ Enviado</span>
                            ) : (
                              <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: horasRestantes < 12 ? C.terra : C.tan }}>Vence en {horasRestantes}h</span>
                            )}
                          </div>
                          {sol.status === 'confirmada_caficultor' && (
                            <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0 }}>
                              {sol.empresaCourier} · Guía: <strong>{sol.numeroGuia}</strong>
                            </p>
                          )}
                          {sol.status === 'solicitada' && (
                            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <select value={guia.empresa} onChange={e => setHubGuiaForm(f => ({ ...f, [sol.id]: { ...guia, empresa: e.target.value } }))}
                                  style={{ flex: 1, padding: '9px 10px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 12, color: C.brown }}>
                                  <option value="">Empresa courier</option>
                                  {['Shalom', 'Olva', 'Cruz del Sur', 'Otro'].map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                                <input placeholder="Nº de guía" value={guia.numero}
                                  onChange={e => setHubGuiaForm(f => ({ ...f, [sol.id]: { ...guia, numero: e.target.value } }))}
                                  style={{ flex: 1, padding: '9px 10px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 12, color: C.brown }} />
                              </div>
                              <button onClick={() => handleConfirmarEnvioHub(sol.id, sol.loteId)}
                                disabled={!guia.empresa || !guia.numero || confirmandoHub === sol.id}
                                style={{ background: guia.empresa && guia.numero ? C.terra : '#ccc', color: 'white', border: 'none', borderRadius: 8, padding: '10px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: guia.empresa && guia.numero ? 'pointer' : 'not-allowed', opacity: confirmandoHub === sol.id ? 0.7 : 1 }}>
                                {confirmandoHub === sol.id ? 'Confirmando...' : 'Confirmar envío →'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab: Certificación */}
            {subTabSolicitudes === 'certificacion' && (
              <div>
                {misCertificaciones.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0 60px' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🔬</div>
                    <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, fontWeight: 700, color: C.brown, margin: '0 0 8px' }}>
                      Certifica la calidad de tu café
                    </p>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, lineHeight: 1.7, maxWidth: 340, margin: '0 auto' }}>
                      Envía una muestra a un laboratorio Q-Grader. Si el puntaje supera el umbral SCA, tu lote se publica automáticamente en el catálogo para que las cafeterías lo compren.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {misCertificaciones.map(cert => {
                      const lote = misLotes.find(l => l.id === cert.loteId);
                      const lab = laboratorios.find(l => l.id === cert.laboratorioId);
                      const statusColor: Record<string, string> = {
                        abierta: '#d6b15a', aceptada: '#8a6fc9',
                        muestra_en_camino: '#d6b15a', muestra_recibida: C.sage,
                        en_proceso: '#8a6fc9', completada: C.sage, expirada: '#e06060',
                      };
                      return (
                        <div key={cert.id} style={{ background: 'white', borderRadius: 10, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${statusColor[cert.status] ?? C.tan}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 9, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>{cert.loteId}</p>
                              <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, color: C.brown, margin: 0, fontWeight: 700 }}>{cert.nombreLote}</p>
                            </div>
                            <span style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: statusColor[cert.status] ?? C.tan, background: `${statusColor[cert.status]}18`, padding: '4px 10px', borderRadius: 20 }}>
                              {cert.status === 'abierta'           ? 'Buscando lab...' :
                               cert.status === 'aceptada'          ? 'Enviar muestra' :
                               cert.status === 'muestra_en_camino' ? 'En camino ✈' :
                               cert.status === 'muestra_recibida'  ? 'Catando' :
                               cert.status === 'en_proceso'        ? 'En proceso' :
                               cert.status === 'completada'        ? 'Completada ✓' : 'Expirada'}
                            </span>
                          </div>
                          {lab && (
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                              <div>
                                <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Laboratorio</p>
                                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: 0, fontWeight: 600 }}>{lab.nombreComercial}</p>
                              </div>
                              <div>
                                <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase' }}>Dirección</p>
                                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0 }}>{lab.direccion}</p>
                              </div>
                            </div>
                          )}
                          {cert.status === 'aceptada' && lab && (
                            <div style={{ background: '#f5f9ff', border: '1px solid #8a6fc930', borderRadius: 10, padding: 14, marginTop: 10 }}>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: '#8a6fc9', margin: '0 0 6px' }}>
                                📦 Envía tu muestra de 200g al laboratorio
                              </p>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                                <select
                                  value={certGuiaForm[cert.id]?.empresa ?? ''}
                                  onChange={e => setCertGuiaForm(prev => ({ ...prev, [cert.id]: { ...prev[cert.id], empresa: e.target.value, numero: prev[cert.id]?.numero ?? '' } }))}
                                  style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 12, color: C.brown, background: 'white' }}
                                >
                                  <option value=''>Courier...</option>
                                  <option value='Shalom'>Shalom</option>
                                  <option value='Olva'>Olva</option>
                                  <option value='Cruz del Sur'>Cruz del Sur</option>
                                  <option value='Otro'>Otro</option>
                                </select>
                                <input
                                  value={certGuiaForm[cert.id]?.numero ?? ''}
                                  onChange={e => setCertGuiaForm(prev => ({ ...prev, [cert.id]: { ...prev[cert.id], numero: e.target.value, empresa: prev[cert.id]?.empresa ?? '' } }))}
                                  placeholder='Nro. de guía'
                                  style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 12, color: C.brown, background: 'white', boxSizing: 'border-box' as const }}
                                />
                              </div>
                              <button
                                onClick={() => handleEnviarMuestraCert(cert.id)}
                                disabled={enviandoMuestraCert === cert.id || !certGuiaForm[cert.id]?.empresa || !certGuiaForm[cert.id]?.numero}
                                style={{ background: '#8a6fc9', color: 'white', border: 'none', borderRadius: 8, padding: '9px 16px', fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (!certGuiaForm[cert.id]?.empresa || !certGuiaForm[cert.id]?.numero) ? 0.5 : 1 }}
                              >
                                {enviandoMuestraCert === cert.id ? 'Confirmando...' : 'Confirmar envío →'}
                              </button>
                            </div>
                          )}
                          {cert.status === 'muestra_en_camino' && (
                            <div style={{ background: '#fffbf0', border: '1px solid #d6b15a40', borderRadius: 10, padding: 12, marginTop: 10 }}>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: '#d6b15a', fontWeight: 700, margin: 0 }}>
                                ✈ Muestra en camino — {cert.empresaCourierMuestra} · Guía: {cert.numeroGuiaMuestra}
                              </p>
                              <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: '4px 0 0' }}>
                                Esperando confirmación de recepción.
                              </p>
                            </div>
                          )}
                          {lote && cert.status === 'completada' && lote.puntajeOficial && (
                            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.sage, margin: '8px 0 0', fontWeight: 700 }}>
                              Puntaje SCA: {lote.puntajeOficial} pts — {lote.status === 'publicado' ? 'Lote publicado ✓' : lote.status}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* NUEVO LOTE — F01 + F02 */}
        {tab === 'nuevo_lote' && !submitted && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
              Publicar nuevo lote
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24, lineHeight: 1.6 }}>
              Completa los datos de tu lote. Tunay Wasi conecta tu café directamente con cafeterías y tostadoras.
              Cuando publicas, guardamos muestras en nuestro hub en Lima para agilizar la entrega — así las cafeterías
              reciben su muestra rápido y sin esperas. Cuando un comprador hace un pedido, recibes tu pago directamente.
            </p>

            <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'grid', gap: 18 }}>
              <div>
                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Nombre del lote *</label>
                <input style={inputStyle} value={loteForm.nombreLote} onChange={e => setField('nombreLote', e.target.value)}
                  placeholder="Ej: Finca San José — Geisha Honey Lote 01" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Variedad *</label>
                  <input style={inputStyle} value={loteForm.variedad} onChange={e => setField('variedad', e.target.value)}
                    placeholder="Geisha, Caturra, Bourbon..." />
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Proceso *</label>
                  <select style={inputStyle} value={loteForm.proceso} onChange={e => setField('proceso', e.target.value)}>
                    <option value="lavado">Lavado</option>
                    <option value="natural">Natural</option>
                    <option value="honey">Honey</option>
                    <option value="anaerobico">Anaeróbico</option>
                    <option value="doble_fermentacion">Doble fermentación</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Altitud (msnm) *</label>
                  <input style={inputStyle} type="number" value={loteForm.altitud} onChange={e => setField('altitud', e.target.value)}
                    placeholder="1800" />
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Cosecha *</label>
                  <input style={inputStyle} value={loteForm.cosecha} onChange={e => setField('cosecha', e.target.value)}
                    placeholder="Junio 2026" />
                </div>
              </div>

              <div>
                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>
                  Puntaje SCA referencial (opcional)
                </label>
                <input style={inputStyle} type="number" value={loteForm.puntajeReferencial}
                  onChange={e => setField('puntajeReferencial', e.target.value)}
                  placeholder="Ej: 84.5" min={60} max={100} step={0.25} />
                <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '4px 0 0' }}>
                  Si tienes una evaluación propia, ingrésala. El puntaje oficial lo certifica el laboratorio.
                </p>
              </div>

              {/* Foto del lote — opcional */}
              <div>
                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>
                  Foto del lote (opcional) — JPG o PNG, máx. 5 MB
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    setFotoFile(file);
                    setFotoPreview(file ? URL.createObjectURL(file) : null);
                  }}
                  style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, width: '100%' }}
                />
                {fotoPreview && (
                  <div style={{ marginTop: 10, position: 'relative', display: 'inline-block' }}>
                    <img src={fotoPreview} alt="preview" style={{ width: 160, height: 100, objectFit: 'cover', borderRadius: 8, border: `1px solid ${C.tan}40` }} />
                    <button
                      type="button"
                      onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                )}
                {uploadProgress !== null && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ height: 4, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${uploadProgress}%`, background: C.terra, transition: 'width 0.2s' }} />
                    </div>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, marginTop: 4 }}>Subiendo imagen... {uploadProgress}%</p>
                  </div>
                )}
              </div>

              {/* Certificado existente */}
              <div>
                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>
                  ¿Ya tienes certificado SCA? Adjúntalo (PDF, JPG, PNG)
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    setCertFile(file);
                    setCertNombre(file ? file.name : null);
                  }}
                  style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, width: '100%' }}
                />
                {certNombre && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.sage }}>📄 {certNombre}</span>
                    <button type="button" onClick={() => { setCertFile(null); setCertNombre(null); }}
                      style={{ background: 'none', border: 'none', color: C.tan, cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                )}
                <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '4px 0 0', lineHeight: 1.5 }}>
                  Si ya tienes una catación SCA de un laboratorio certificado, adjúntala y tu lote podrá publicarse directamente. Si no tienes, puedes solicitarla desde el portal una vez registrado el lote.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Sacos disponibles *</label>
                  <input style={inputStyle} type="number" value={loteForm.sacosDisponibles} onChange={e => setField('sacosDisponibles', e.target.value)}
                    placeholder="10" min={1} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Kg por saco *</label>
                  <input style={inputStyle} type="number" value={loteForm.pesoPorSacoKg} onChange={e => setField('pesoPorSacoKg', e.target.value)}
                    placeholder="60" min={1} max={70} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Precio mínimo por saco (S/) *</label>
                  <input style={inputStyle} type="number" value={loteForm.precioOrigenPEN} onChange={e => setField('precioOrigenPEN', e.target.value)}
                    placeholder="850" min={100} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>
                    Muestras 200g en hub Lima
                  </label>
                  <input style={inputStyle} type="number" value={loteForm.stockMuestrasHub} onChange={e => setField('stockMuestrasHub', e.target.value)}
                    placeholder="5" min={0} max={50} />
                  <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '4px 0 0' }}>
                    Unidades de 200g que envías al hub Tunay Wasi en Lima para despacho inmediato a tostadoras
                  </p>
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>
                    ¿Hay muestras disponibles?
                  </label>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    {[{ v: 'true', label: 'Sí' }, { v: 'false', label: 'No' }].map(opt => (
                      <label key={opt.v} style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.brown, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" name="muestraDisponible" value={opt.v}
                          checked={loteForm.muestraDisponible === opt.v}
                          onChange={e => setField('muestraDisponible', e.target.value)} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calculadora de ingresos en tiempo real */}
              {precioOrigen > 0 && (
                <div style={{ background: C.green, borderRadius: 10, padding: 16, color: C.cream }}>
                  <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.sage, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
                    Estimado — precio al tostador en Lima
                  </p>
                  {[
                    { label: 'Tu precio (lo que tú recibes)', val: `S/ ${precioOrigen.toLocaleString()}` },
                    { label: `Comisión plataforma (${(COMISION_TW * 100).toFixed(0)}%)`, val: `+ S/ ${comisionPlataforma}` },
                    { label: 'Flete Lima', val: `+ S/ ${FLETE_POR_SACO_PEN}` },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan }}>{r.label}</span>
                      <span style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.cream }}>{r.val}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid rgba(143,175,138,0.3)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 700 }}>Precio final al tostador</span>
                    <span style={{ fontFamily: 'Cormorant Garamond', fontSize: 20, fontWeight: 700, color: C.terra }}>S/ {precioFinal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div style={{ background: '#fffbf5', border: `1px solid ${C.tan}40`, borderRadius: 10, padding: 14 }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.brown, margin: '0 0 6px', fontWeight: 600 }}>
                  Próximo paso: enviar muestra de 200g
                </p>
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, margin: 0, lineHeight: 1.7 }}>
                  Envía 200g de tu café verde (en pergamino o trillado) por <strong>Shalom o Olva</strong> a:<br />
                  <strong>Jr. Ucayali 142, Lima Centro — A nombre de: Tunay Wasi</strong><br />
                  Costo de envío: S/15-20. Te reembolsamos si el lote se aprueba.
                </p>
              </div>

              <button
                style={{
                  background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                  padding: '14px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', opacity: (!loteForm.nombreLote || !loteForm.variedad || !loteForm.precioOrigenPEN || guardando) ? 0.5 : 1,
                }}
                onClick={handleSubmitLote}
                disabled={!loteForm.nombreLote || !loteForm.variedad || !loteForm.precioOrigenPEN || guardando}
              >
                {guardando ? 'Guardando...' : 'Registrar lote y recibir instrucciones de envío →'}
              </button>
              {errorLote && (
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: '#c0392b', margin: '8px 0 0' }}>{errorLote}</p>
              )}
            </div>
          </div>
        )}

        {tab === 'nuevo_lote' && submitted && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🌱</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 8 }}>
              ¡Lote registrado!
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, lineHeight: 1.7, maxWidth: 440, margin: '0 auto 20px' }}>
              Tu lote está guardado como <strong>borrador</strong>. Esto es lo que registramos:
            </p>

            {/* Resumen de lo completado */}
            <div style={{ textAlign: 'left', maxWidth: 440, margin: '0 auto 24px', display: 'grid', gap: 10 }}>
              {[
                {
                  ok: !!fotoPreview,
                  titulo: 'Foto del lote',
                  desc: fotoPreview ? 'Imagen subida correctamente.' : 'No agregaste foto. Puedes subirla desde "Mis lotes" antes de publicar.',
                },
                {
                  ok: !!certUrl,
                  titulo: 'Certificado SCA',
                  desc: certUrl
                    ? 'Certificado adjuntado. Lo validamos y habilitamos la publicación.'
                    : 'No adjuntaste certificado. Desde "Mis lotes" puedes subir uno existente o solicitar la certificación con un laboratorio de la plataforma.',
                },
                {
                  ok: false,
                  titulo: 'Publicación',
                  desc: (fotoPreview && certUrl)
                    ? 'Todo listo — ve a "Mis lotes" y presiona Publicar para que las cafeterías puedan verlo.'
                    : 'Completa los puntos pendientes y luego publica tu lote desde "Mis lotes".',
                },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, background: '#faf7f3', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ minWidth: 24, height: 24, borderRadius: '50%', background: item.ok ? C.sage : C.tan, color: 'white', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    {item.ok ? '✓' : '·'}
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: C.green, margin: '0 0 4px' }}>{item.titulo}</p>
                    <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => { setSubmitted(false); setTab('mis_lotes'); }} style={{
              background: C.terra, color: 'white', border: 'none', borderRadius: 8,
              padding: '12px 28px', fontFamily: 'Montserrat', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>
              Ver mis lotes →
            </button>
          </div>
        )}

        {/* PERFIL */}
        {tab === 'mis_pagos' && (
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 28, color: C.brown, marginBottom: 6 }}>
              Mis pagos
            </h2>
            <p style={{ fontFamily: 'Montserrat', fontSize: 13, color: C.tan, marginBottom: 24, lineHeight: 1.6 }}>
              Aquí aparecen los pagos de tus pedidos entregados. Tunay Wasi transfiere tu monto dentro de las 48h hábiles tras confirmar la entrega.
            </p>

            {/* Pedidos en curso — esperando pago, en preparación, en tránsito */}
            {misPedidos.filter(p => !['entregado', 'cancelado'].includes(p.logisticaStatus) && p.pagoCaficultorStatus !== 'pagado').length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.tan }}>
                    Pedidos en curso
                  </span>
                  <span style={{ background: C.tan, color: 'white', fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                    {misPedidos.filter(p => !['entregado', 'cancelado'].includes(p.logisticaStatus) && p.pagoCaficultorStatus !== 'pagado').length}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {misPedidos.filter(p => !['entregado', 'cancelado'].includes(p.logisticaStatus) && p.pagoCaficultorStatus !== 'pagado').map(ped => {
                    const lote = misLotes.find(l => l.id === ped.loteId);
                    const logLabel: Record<string, string> = {
                      pendiente_pago: 'Esperando pago de cafetería',
                      en_origen: 'Pago verificado — listo para despachar',
                      en_transito: 'En tránsito a Lima',
                      en_almacen: 'En almacén Lima',
                    };
                    const logColor: Record<string, string> = {
                      pendiente_pago: C.tan,
                      en_origen: C.terra,
                      en_transito: '#8a6fc9',
                      en_almacen: C.sage,
                    };
                    return (
                      <div key={ped.id} style={{
                        background: 'white', borderRadius: 12, padding: '16px 20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        borderLeft: `4px solid ${logColor[ped.logisticaStatus] ?? C.tan}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {ped.id} · {lote?.nombreLote ?? ped.loteId}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 4px' }}>
                            {ped.sacosSolicitados} saco(s) · {ped.razonSocial}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 600, color: logColor[ped.logisticaStatus] ?? C.tan, margin: 0 }}>
                            {logLabel[ped.logisticaStatus] ?? ped.logisticaStatus}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: 700, color: C.brown, margin: 0 }}>
                            S/ {ped.montoCaficultorPEN.toLocaleString()}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: 0 }}>tu parte</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pendientes de cobro */}
            {misPedidos.filter(p => p.logisticaStatus === 'entregado' && p.pagoCaficultorStatus === 'pendiente').length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.terra }}>
                    Por cobrar
                  </span>
                  <span style={{ background: C.terra, color: 'white', fontSize: 10, fontFamily: 'Montserrat', fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                    {misPedidos.filter(p => p.logisticaStatus === 'entregado' && p.pagoCaficultorStatus === 'pendiente').length}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {misPedidos.filter(p => p.logisticaStatus === 'entregado' && p.pagoCaficultorStatus === 'pendiente').map(ped => {
                    const lote = misLotes.find(l => l.id === ped.loteId);
                    return (
                      <div key={ped.id} style={{
                        background: 'white', borderRadius: 12, padding: '16px 20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${C.terra}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {ped.id} · {lote?.nombreLote ?? ped.loteId}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 2px' }}>
                            {ped.sacosSolicitados} saco(s) · {ped.razonSocial}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.terra, margin: 0, fontWeight: 600 }}>
                            Entregado — pago en proceso (máx. 48h hábiles)
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, color: C.terra, margin: 0 }}>
                            S/ {ped.montoCaficultorPEN.toLocaleString()}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: 0 }}>pendiente</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pagos recibidos */}
            {misPedidos.filter(p => p.pagoCaficultorStatus === 'pagado').length > 0 && (
              <div>
                <p style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.tan, marginBottom: 12 }}>
                  Pagos recibidos
                </p>
                <div style={{ display: 'grid', gap: 10 }}>
                  {misPedidos.filter(p => p.pagoCaficultorStatus === 'pagado').map(ped => {
                    const lote = misLotes.find(l => l.id === ped.loteId);
                    return (
                      <div key={ped.id} style={{
                        background: 'white', borderRadius: 12, padding: '16px 20px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${C.sage}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {ped.id} · {lote?.nombreLote ?? ped.loteId}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 2px' }}>
                            {ped.sacosSolicitados} saco(s) · {ped.razonSocial}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.sage, margin: 0, fontWeight: 600 }}>
                            Pagado ✓{ped.pagoCaficultorAt ? ' · ' + new Date(ped.pagoCaficultorAt).toLocaleDateString('es-PE') : ''}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, color: C.sage, margin: 0 }}>
                            S/ {ped.montoCaficultorPEN.toLocaleString()}
                          </p>
                          <p style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, margin: 0 }}>recibido</p>
                        </div>
                        </div>
                        {ped.logisticaStatus === 'entregado' && !calificacionesYaHechas.has(ped.id) && (
                          <div style={{ marginTop: 10, borderTop: '1px solid #f0ebe4', paddingTop: 10 }}>
                            <button
                              onClick={() => { setModalCalifPedido(ped); setCalifPuntaje(5); setCalifComentario(''); }}
                              style={{ background: 'none', border: `1px solid ${C.terra}`, color: C.terra, borderRadius: 8, padding: '6px 14px', fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              ★ Calificar cafetería
                            </button>
                          </div>
                        )}
                        {ped.logisticaStatus === 'entregado' && calificacionesYaHechas.has(ped.id) && (
                          <p style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.sage, margin: '8px 0 0' }}>✓ Ya calificaste esta cafetería</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Estado vacío */}
            {misPedidos.filter(p => p.logisticaStatus !== 'cancelado').length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ fontFamily: 'Montserrat', fontSize: 14, color: C.tan }}>
                  Aún no tienes pagos registrados.<br />
                  Aparecerán aquí cuando un pedido sea entregado.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'perfil' && (
          <div style={{ background: 'white', borderRadius: 14, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: 560 }}>
            {/* Avatar + nombre actual */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.terra, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, fontFamily: 'Cormorant Garamond', color: 'white', flexShrink: 0 }}>
                  {caficultor.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: 0 }}>{caficultor.nombre}</h2>
                  <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '2px 0 0' }}>{caficultor.email}</p>
                </div>
              </div>
              <button onClick={onLogout} title="Cerrar sesión" style={{ background: 'none', border: 'none', borderRadius: 10, padding: '8px', cursor: 'pointer', color: C.tan, lineHeight: 1, flexShrink: 0, opacity: 0.7, transition: 'opacity 0.15s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>

            {/* Formulario edición */}
            <h3 style={{ fontFamily: 'Montserrat', fontSize: 11, fontWeight: 700, color: C.tan, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
              Editar datos
</h3>
            <div style={{ display: 'grid', gap: 14 }}>
              {([
                { key: 'nombre', label: 'Nombre completo' },
                { key: 'finca', label: 'Nombre de la finca' },
                { key: 'region', label: 'Región / departamento' },
                { key: 'telefono', label: 'Teléfono (ej: +51 987 654 321)' },
              ] as { key: keyof typeof perfilForm; label: string }[]).map(({ key, label }) => (
                <div key={key}>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>{label}</label>
                  <input
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, background: 'white', boxSizing: 'border-box' }}
                    value={perfilForm[key]}
                    onChange={e => setPerfilForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}

              {perfilGuardado && (
                <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.sage, margin: 0 }}>
                  ✓ Perfil actualizado correctamente.
                </p>
              )}

              <button
                onClick={async () => {
                  setGuardandoPerfil(true);
                  setPerfilGuardado(false);
                  await updatePerfil(caficultor.uid, {
                    nombre: perfilForm.nombre,
                    finca: perfilForm.finca,
                    region: perfilForm.region,
                    ...(perfilForm.telefono ? { telefono: perfilForm.telefono } : {}),
                  });
                  await sincronizarCaficultorDoc({
                    uid: caficultor.uid,
                    nombre: perfilForm.nombre,
                    finca: perfilForm.finca,
                    region: perfilForm.region,
                  });
                  setGuardandoPerfil(false);
                  setPerfilGuardado(true);
                }}
                disabled={guardandoPerfil || !perfilForm.nombre || !perfilForm.finca || !perfilForm.region}
                style={{
                  background: C.terra, color: 'white', border: 'none', borderRadius: 8,
                  padding: '12px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700,
                  cursor: (guardandoPerfil || !perfilForm.nombre || !perfilForm.finca || !perfilForm.region) ? 'not-allowed' : 'pointer',
                  opacity: (guardandoPerfil || !perfilForm.nombre || !perfilForm.finca || !perfilForm.region) ? 0.5 : 1,
                }}
              >
                {guardandoPerfil ? 'Guardando...' : 'Guardar cambios →'}
              </button>
            </div>

            {/* Soporte */}
            <div style={{ borderTop: '1px solid #f0ebe4', marginTop: 24, paddingTop: 16 }}>
              <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: 0 }}>
                ¿Dudas o problemas? Escríbenos a{' '}
                <a href="mailto:tunaywasi@gmail.com" style={{ color: C.terra, fontWeight: 700, textDecoration: 'none' }}>tunaywasi@gmail.com</a>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal edición de lote */}
      {editandoLote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: 0 }}>Editar lote</h3>
              <button onClick={() => setEditandoLote(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.tan }}>✕</button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Nombre del lote</label>
                <input style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }}
                  value={editForm.nombreLote} onChange={e => setEditForm(f => ({ ...f, nombreLote: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Variedad</label>
                  <input style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }}
                    value={editForm.variedad} onChange={e => setEditForm(f => ({ ...f, variedad: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Proceso</label>
                  <select style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }}
                    value={editForm.proceso} onChange={e => setEditForm(f => ({ ...f, proceso: e.target.value }))}>
                    <option value="lavado">Lavado</option>
                    <option value="natural">Natural</option>
                    <option value="honey">Honey</option>
                    <option value="anaerobico">Anaeróbico</option>
                    <option value="doble_fermentacion">Doble fermentación</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Altitud (msnm)</label>
                  <input type="number" style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }}
                    value={editForm.altitud} onChange={e => setEditForm(f => ({ ...f, altitud: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Cosecha</label>
                  <input style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }}
                    value={editForm.cosecha} onChange={e => setEditForm(f => ({ ...f, cosecha: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Sacos</label>
                  <input type="number" min={1} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }}
                    value={editForm.sacosDisponibles} onChange={e => setEditForm(f => ({ ...f, sacosDisponibles: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Kg/saco</label>
                  <input type="number" min={10} max={70} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }}
                    value={editForm.pesoPorSacoKg} onChange={e => setEditForm(f => ({ ...f, pesoPorSacoKg: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Precio/saco (S/)</label>
                  <input type="number" min={100} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }}
                    value={editForm.precioOrigenPEN} onChange={e => setEditForm(f => ({ ...f, precioOrigenPEN: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>Muestras 200g en hub Lima</label>
                  <input type="number" min={0} max={50} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }}
                    value={editForm.stockMuestrasHub} onChange={e => setEditForm(f => ({ ...f, stockMuestrasHub: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontFamily: 'Montserrat', fontSize: 11, color: C.tan, display: 'block', marginBottom: 4 }}>¿Muestras disponibles?</label>
                  <select style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 13, color: C.brown, boxSizing: 'border-box' }}
                    value={editForm.muestraDisponible} onChange={e => setEditForm(f => ({ ...f, muestraDisponible: e.target.value }))}>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setEditandoLote(null)}
                  style={{ flex: 1, background: 'none', border: `1px solid ${C.tan}`, borderRadius: 8, padding: '11px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 600, color: C.tan, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleGuardarEdit} disabled={guardandoEdit}
                  style={{ flex: 2, background: C.terra, border: 'none', borderRadius: 8, padding: '11px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, color: 'white', cursor: guardandoEdit ? 'not-allowed' : 'pointer', opacity: guardandoEdit ? 0.6 : 1 }}>
                  {guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal perfil cafetería */}
      {modalCafeteria && (() => { const ped = modalCafeteria!; const califs = modalCafeteriaCalifs; const califsLoaded = califs !== null; return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: 0 }}>Perfil cafetería</h3>
              <button onClick={() => setModalCafeteria(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.tan }}>✕</button>
            </div>
            <p style={{ fontFamily: 'Montserrat', fontSize: 15, fontWeight: 700, color: C.brown, margin: '0 0 4px' }}>{ped.razonSocial}</p>
            <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 16px' }}>RUC {ped.ruc}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
              <div style={{ background: '#f5f9ff', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Montserrat', fontSize: 20, fontWeight: 700, color: '#8a6fc9' }}>
                  {!califsLoaded ? '…' : califs!.total === 0 ? '—' : califs!.promedio.toFixed(1)}
                </div>
                <div style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, marginTop: 2 }}>
                  {!califsLoaded ? '' : califs!.total === 0 ? 'Sin reseñas' : `★ ${califs!.total} reseña${califs!.total !== 1 ? 's' : ''}`}
                </div>
              </div>
              <div style={{ background: '#f5f9f5', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Montserrat', fontSize: 20, fontWeight: 700, color: C.sage }}>
                  {modalCafeteriaPedidos === null ? '…' : modalCafeteriaPedidos}
                </div>
                <div style={{ fontFamily: 'Montserrat', fontSize: 10, color: C.tan, marginTop: 2 }}>Pedidos completados</div>
              </div>
            </div>
            <button onClick={() => setModalCafeteria(null)} style={{ width: '100%', background: '#f5f0ea', color: C.brown, border: 'none', borderRadius: 8, padding: '12px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 18 }}>
              Cerrar
            </button>
          </div>
        </div>
      ); })()}

      {/* Modal calificación cafetería */}
      {modalCalifPedido && (() => { const ped = modalCalifPedido!; return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 22, color: C.brown, margin: 0 }}>Calificar cafetería</h3>
              <button onClick={() => setModalCalifPedido(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.tan }}>✕</button>
            </div>
            <p style={{ fontFamily: 'Montserrat', fontSize: 12, color: C.tan, margin: '0 0 16px' }}>Pedido {ped.id} · {ped.razonSocial}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {([1,2,3,4,5] as const).map(n => (
                <button key={n} onClick={() => setCalifPuntaje(n)} style={{
                  fontSize: 26, background: 'none', border: 'none', cursor: 'pointer',
                  opacity: califPuntaje >= n ? 1 : 0.25,
                }}>★</button>
              ))}
            </div>
            <textarea
              value={califComentario}
              onChange={e => setCalifComentario(e.target.value.slice(0, 300))}
              placeholder="Comentario opcional (máx. 300 caracteres)"
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'Montserrat', fontSize: 12, color: C.brown, resize: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalCalifPedido(null)} style={{ flex: 1, background: '#f5f0ea', color: C.brown, border: 'none', borderRadius: 8, padding: '12px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleGuardarCalificacion} disabled={guardandoCalif} style={{ flex: 1, background: C.terra, color: 'white', border: 'none', borderRadius: 8, padding: '12px', fontFamily: 'Montserrat', fontSize: 13, fontWeight: 700, cursor: guardandoCalif ? 'not-allowed' : 'pointer', opacity: guardandoCalif ? 0.6 : 1 }}>
                {guardandoCalif ? 'Guardando...' : 'Enviar calificación →'}
              </button>
            </div>
          </div>
        </div>
      ); })()}

    </div>
  );
}
