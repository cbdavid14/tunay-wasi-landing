/**
 * CatalogoPublico.tsx — TunayWasi Home & Catálogo Público
 * Orquestador delgado; lógica de UI extraída a catalogo/
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { navigate } from '@/router'
import { irALogin } from '../retorno'
import { marcarOrigenOnboarding } from '../onboarding'
import type { ProductoONE, CaficultorONE, FormatoONE } from '../types'
import { fetchProductos, fetchCaficultores, fetchPedidosByNegocio } from '../service'
import type { PedidoONE } from '../types'
import seedProductos from '../seed/one_productos.json'
import seedCaficultores from '../seed/one_caficultores.json'
import { useTheme, setTheme as applyTheme, getStoredTheme } from '@/shared/useTheme'
import {
  type CatalogoProps, type MockCafe, type TipoProducto, TIPO_LABEL,
} from './catalogo/catalogoData'
import { DetalleProductoInline } from './catalogo/DetalleProductoInline'
import { ModalCaficultor } from './catalogo/ModalCaficultor'

// ─── Componente Principal ────────────────────────────────────────────────────

export const CatalogoPublico: React.FC<CatalogoProps> = ({
  onSeleccionar,
  onSolicitarCotizacion,
  modoSeleccion,
  carritoCount = 0,
  totalCarritoCents = 0,
  onIrAlCheckout,
  carritoProductoIds,
  carritoLineas = [],
  isDemo = false,
  sidebarOffset = 0,
  embeddedMode = false,
  hideFiltersHeader = false,
  rolUsuario = null,
  userNombre = null,
  userUid = null,
  estadoAprobacionB2B = null,
  searchValue,
  onSearchChange,
}) => {
  useTheme()
  void carritoLineas
  void sidebarOffset

  const isEnCarrito = (m: MockCafe) => {
    if (!carritoProductoIds) return false
    const prod = productos.find(p => p.nombre === m.nombre)
    return prod ? carritoProductoIds.has(prod.id) : false
  }

  const [temaActual, setTemaActual] = useState<'cream' | 'dark' | 'white'>(getStoredTheme() || 'cream')

  const [productos, setProductos] = useState<ProductoONE[]>([])
  const [caficultores, setCaficultores] = useState<Map<string, CaficultorONE>>(new Map())
  const [loading, setLoading] = useState(true)
  const [pedidos, setPedidos] = useState<PedidoONE[]>([])

  const [searchInterno, setSearchInterno] = useState('')
  const search = searchValue !== undefined ? searchValue : searchInterno
  const setSearch = onSearchChange ?? setSearchInterno
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [procesoFilter, setProcesoFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<TipoProducto | 'all'>('all')
  const [saboresFilter, setSaboresFilter] = useState<'all' | 'floral' | 'frutal' | 'chocolate' | 'caramelo'>('all')
  const [sortBy, setSortBy] = useState<'relevancia' | 'recientes' | 'precio_asc' | 'precio_desc' | 'evidencia'>('relevancia')
  const [_orderStep, _setOrderStep] = useState(1)
  const [appDrawerOpen, setAppDrawerOpen] = useState(false)
  const [productoDetalle, setProductoDetalle] = useState<ProductoONE | null>(null)
  const [detalleFormato, setDetalleFormato] = useState<string>('1kg')
  const [detalleCantidad, setDetalleCantidad] = useState(1)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [caficultorModalId, setCaficultorModalId] = useState<number | null>(null)

  const lavadoRef = useRef<HTMLDivElement>(null)
  const naturalRef = useRef<HTMLDivElement>(null)
  const honeyRef = useRef<HTMLDivElement>(null)

  const cambiarTema = (t: 'cream' | 'dark' | 'white') => {
    setTemaActual(t)
    applyTheme(t)
  }

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  useEffect(() => {
    if (isDemo) {
      setProductos(seedProductos as ProductoONE[])
      setCaficultores(new Map((seedCaficultores as CaficultorONE[]).map(c => [c.id, c])))
      setLoading(false)
      return
    }
    async function cargar() {
      try {
        const { auth } = await import('@/shared/firebase')
        const uid = auth.currentUser?.uid
        const [prods, cafics, peds] = await Promise.all([
          fetchProductos(),
          fetchCaficultores(),
          uid ? fetchPedidosByNegocio(uid) : Promise.resolve([]),
        ])
        setProductos(prods)
        setCaficultores(new Map(cafics.map(c => [c.id, c])))
        setPedidos(peds)
      } catch (err) {
        console.warn('Error cargando catálogo', err)
        setProductos([])
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [isDemo])

  // Helper: derivar MockCafe desde ProductoONE para compatibilidad con el render
  const toMockCafe = (p: ProductoONE): MockCafe => {
    const procesoMap: Record<string, string> = { lavado: 'Lavado', natural: 'Natural', honey: 'Honey', anaerobico: 'Anaeróbico' }
    return {
      id: parseInt(p.id.replace(/\D/g, '').slice(-6) || '0', 10) || (Math.random() * 9999 | 0),
      nombre: p.nombre,
      variedad: p.variedad,
      proceso: procesoMap[p.proceso] ?? p.proceso,
      region: p.caficultorRegion ?? 'Perú',
      caf: p.caficultorNombre,
      notas: p.notasSabor.join(', '),
      precio: p.precioBaseKgCents / 100,
      nivelEvidencia: 1 as 1 | 2 | 3,
      visualQuality: 'Bueno' as 'Bueno' | 'Muy bueno' | 'Excepcional',
      emoji: '☕',
      pricingMode: p.pricingMode,
      productType: (
        // tipoCafe='verde' (o variantes) → café verde sin tostar (TYPE_A)
        p.tipoCafe === 'verde' || p.tipoCafe === 'verde_grano' || p.tipoCafe === 'cafe_verde'
          ? 'TYPE_A'
          : p.presentacion === 'tostado_molido' || p.tipoCafe === 'tostado_molido' || p.tipoCafe === 'molido'
          ? 'TYPE_C'
          : 'TYPE_B'
      ) as TipoProducto,
    } as MockCafe
  }

  const SABOR_NOTAS: Record<string, string[]> = {
    floral: ['jazmín', 'hibisco', 'rosas', 'floral', 'lavanda', 'azahar'],
    frutal: ['durazno', 'mandarina', 'cereza', 'limón', 'manzana', 'maracuyá', 'fresa', 'frutal'],
    chocolate: ['chocolate', 'cacao', 'nuez', 'almendra', 'avellana'],
    caramelo: ['caramelo', 'panela', 'miel', 'toffee', 'melaza', 'dulce'],
  }

  const cafésFiltrados = useMemo(() => {
    const q = search.toLowerCase().trim()
    const fuente: MockCafe[] = productos.filter(p => p.status === 'activo').map(toMockCafe)

    const filtrados = fuente.filter(c => {
      const matchRegion = regionFilter === 'all' || c.region === regionFilter
      const matchProceso = procesoFilter === 'all' || c.proceso === procesoFilter
      const matchType = typeFilter === 'all' || c.productType === typeFilter
      // GAP-F04-09: filtro por nivel de evidencia eliminado — spec §8 indica que el nivel de
      // evidencia NO debe ser filtro de catálogo (estados vacíos frecuentes en volumen bajo)
      const notasStr = c.notas.toLowerCase()
      const matchSabor = saboresFilter === 'all' || SABOR_NOTAS[saboresFilter]?.some(n => notasStr.includes(n))
      const matchSearch =
        !q ||
        c.nombre.toLowerCase().includes(q) ||
        c.caf.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q) ||
        c.notas.toLowerCase().includes(q)
      return matchRegion && matchProceso && matchType && matchSabor && matchSearch
    })

    // Ordenamiento
    return [...filtrados].sort((a, b) => {
      if (sortBy === 'precio_asc') return a.precio - b.precio
      if (sortBy === 'precio_desc') return b.precio - a.precio
      if (sortBy === 'evidencia') return b.nivelEvidencia - a.nivelEvidencia
      if (sortBy === 'recientes') return b.id - a.id
      return 0 // relevancia — mantener orden original
    })
  }, [search, regionFilter, procesoFilter, typeFilter, saboresFilter, sortBy, productos]) // eslint-disable-line react-hooks/exhaustive-deps

  // Filtro más restrictivo activo (para sugerencia vacío US-47)
  const filtroMasRestrictivo = useMemo((): { label: string; limpiar: () => void } | null => {
    if (saboresFilter !== 'all') return { label: `perfil "${saboresFilter}"`, limpiar: () => setSaboresFilter('all') }
    if (procesoFilter !== 'all') return { label: `proceso ${procesoFilter}`, limpiar: () => setProcesoFilter('all') }
    if (typeFilter !== 'all') return { label: `tipo ${typeFilter === 'TYPE_A' ? 'Verde' : typeFilter === 'TYPE_B' ? 'Tostado' : 'Molido'}`, limpiar: () => setTypeFilter('all') }
    if (regionFilter !== 'all') return { label: `región ${regionFilter}`, limpiar: () => setRegionFilter('all') }
    if (search) return { label: `búsqueda "${search}"`, limpiar: () => setSearch('') }
    return null
  }, [saboresFilter, procesoFilter, typeFilter, regionFilter, search])

  const hayFiltrosActivos = regionFilter !== 'all' || procesoFilter !== 'all' || typeFilter !== 'all' || saboresFilter !== 'all' || search !== ''

  const cafesLavado = useMemo(() => cafésFiltrados.filter(c => c.proceso === 'Lavado'), [cafésFiltrados])
  const cafesNatural = useMemo(() => cafésFiltrados.filter(c => c.proceso === 'Natural'), [cafésFiltrados])
  const cafesHoney = useMemo(() => cafésFiltrados.filter(c => c.proceso === 'Honey'), [cafésFiltrados])

  const scrollRow = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    if (!ref.current) return
    ref.current.scrollBy({ left: dir === 'right' ? 360 : -360, behavior: 'smooth' })
  }

  const handleCardClick = (m: MockCafe) => {
    const prod = productos.find(p => p.nombre === m.nombre)
    if (!prod) return
    if (modoSeleccion) {
      modoSeleccion.onToggle(prod)
    } else {
      setProductoDetalle(prod)
      setDetalleFormato('1kg')
      setDetalleCantidad(1)
    }
  }

  // 🔒 guest: guarda el producto como intención (D-15-02) y va directo a "¿Cómo usarás TunayWasi?"
  // (/login?registro=1). Tras registrarse, el destino único lo lleva al checkout con su producto.
  // El café verde (TYPE_A) no se guarda: una persona no puede comprarlo (TIPO-01).
  const irARegistroDesdeCandado = (m: MockCafe) => {
    if (m.productType !== 'TYPE_A') {
      const prod = productos.find(p => p.nombre === m.nombre)
      if (prod) onSeleccionar?.(prod, '1kg')
    }
    marcarOrigenOnboarding('candado_tarjeta')
    irALogin({ registro: true })
  }

  const handleAddClick = (e: React.MouseEvent, m: MockCafe) => {
    e.stopPropagation()
    if (!rolUsuario) {
      irARegistroDesdeCandado(m)
      return
    }
    // TYPE_A = café verde — solo buyer_b2b APPROVED puede comprar (B2B-02, TIPO-01)
    if (m.productType === 'TYPE_A') {
      if (rolUsuario !== 'buyer_b2b' || estadoAprobacionB2B !== 'APPROVED') return
    }
    const prod = productos.find(p => p.nombre === m.nombre)
    if (!prod) return
    onSeleccionar?.(prod, '1kg')
    showToast(`Agregado: ${m.nombre}`)
  }

  const renderAddBtn = (m: MockCafe) => {
    if (!rolUsuario) {
      return (
        <button
          className="sc-add-btn"
          onClick={ev => { ev.stopPropagation(); irARegistroDesdeCandado(m) }}
          title="Regístrate para comprar"
          style={{ fontSize: 10, padding: '3px 6px', opacity: 0.85 }}
        >🔒</button>
      )
    }
    // TIPO-VIS-04: buyer_b2c on TYPE_A → "¿Eres tostador o cafetería? → Registrar negocio"
    if (rolUsuario === 'buyer_b2c' && m.productType === 'TYPE_A') {
      return (
        <button
          className="sc-add-btn"
          onClick={ev => { ev.stopPropagation(); navigate('/registro-emprendedor?tipo=negocio') }}
          title="¿Eres tostador o cafetería? Registra tu negocio"
          style={{ fontSize: 7, padding: '3px 5px', width: 'auto', minWidth: 36, background: 'var(--tw-sage)' }}
        >Negocio →</button>
      )
    }
    // buyer_b2b PENDING/REJECTED/SUSPENDED on TYPE_A → disabled (B2B-02)
    if (rolUsuario === 'buyer_b2b' && m.productType === 'TYPE_A' && estadoAprobacionB2B !== 'APPROVED') {
      return (
        <button
          className="sc-add-btn"
          disabled
          title="Solo disponible para empresas aprobadas"
          style={{ opacity: 0.45, cursor: 'not-allowed', fontSize: 9 }}
          onClick={ev => ev.stopPropagation()}
        >B2B</button>
      )
    }
    return (
      <button
        className={`sc-add-btn${isEnCarrito(m) ? ' in-cart' : ''}`}
        onClick={ev => handleAddClick(ev, m)}
        title={isEnCarrito(m) ? 'En carrito' : 'Agregar'}
      >{isEnCarrito(m) ? '✓' : '+'}</button>
    )
  }

  void _orderStep
  void _setOrderStep

  // ── Vista inline de detalle (solo en embeddedMode / portal) ─────────────────
  if (embeddedMode && productoDetalle) {
    return (
      <DetalleProductoInline
        producto={productoDetalle}
        productos={productos}
        formato={detalleFormato}
        cantidad={detalleCantidad}
        toastMsg={toastMsg}
        onVolver={() => setProductoDetalle(null)}
        onSetFormato={setDetalleFormato}
        onSetCantidad={setDetalleCantidad}
        onAgregar={(p, fmt) => {
          // GAP-F01-13: sin sesión, igual que el 🔒 de la tarjeta (AUTH-01 matizada) — guarda el
          // producto (salvo café verde TYPE_A, TIPO-01) y va a "¿Cómo usarás TunayWasi?"
          if (!rolUsuario) {
            const esVerde = p.tipoCafe === 'verde' || p.tipoCafe === 'verde_grano' || p.tipoCafe === 'cafe_verde'
            if (!esVerde) onSeleccionar?.(p, fmt)
            marcarOrigenOnboarding('detalle_lote')
            irALogin({ registro: true })
            return
          }
          onSeleccionar?.(p, fmt)
          setProductoDetalle(null)
          showToast(`Agregado: ${p.nombre}`)
        }}
        onVerOtro={p => { setProductoDetalle(p); setDetalleFormato('1kg'); setDetalleCantidad(1); window.scrollTo(0, 0) }}
        rolUsuario={rolUsuario}
        estadoAprobacionB2B={estadoAprobacionB2B}
        userUid={userUid}
        onSolicitarCotizacion={(p) => { onSolicitarCotizacion?.(p) }}
        onRegistrarNegocio={() => { navigate('/registro-emprendedor?tipo=negocio') }}
      />
    )
  }

  return (
    <>
      <style>{`
        /* Reset y estilos base sincronizados con simulador-home */
        .tw-app-shell {
          min-height: 100vh;
          background: var(--tw-bg);
          color: var(--tw-text);
          font-family: var(--tw-font-body);
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
        }

        /* Top header */
        .d-header {
          position: sticky;
          top: 0;
          z-index: 60;
          background: var(--tw-bg);
          border-bottom: 1px solid var(--tw-border);
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .app-ham-btn {
          width: 32px;
          height: 32px;
          border-radius: 7px;
          border: 1px solid var(--tw-border);
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: var(--tw-text);
          transition: background .12s;
        }
        .app-ham-btn:hover { background: var(--tw-terra); color: #fff; border-color: var(--tw-terra); }

        .frame-search {
          flex: 1;
          background: var(--tw-card);
          border: 1px solid var(--tw-border);
          border-radius: 8px;
          padding: 7px 12px;
          font-size: 11px;
          font-family: var(--tw-font-body);
          color: var(--tw-text);
          outline: none;
        }
        .frame-search:focus { border-color: var(--tw-terra); }
        .frame-search::placeholder { color: var(--tw-text-muted); }

        /* Chips */
        .d-fchip {
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid var(--tw-border);
          font-size: 10px;
          font-weight: 600;
          color: var(--tw-text-muted);
          cursor: pointer;
          transition: all .12s;
          white-space: nowrap;
          background: transparent;
        }
        .d-fchip.active {
          background: var(--tw-terra);
          color: #fff;
          border-color: var(--tw-terra);
        }
        .d-fchip:hover:not(.active) {
          border-color: var(--tw-terra);
          color: var(--tw-terra);
        }
        .d-filters-row {
          display: flex; flex-wrap: wrap; gap: 5; margin-bottom: 8px;
        }
        @media (max-width: 768px) {
          .d-fchip { padding: 3px 8px; font-size: 9px; }
          .d-filters-row {
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            margin-bottom: 6px;
            gap: 4px;
          }
          .d-filters-row::-webkit-scrollbar { display: none; }
          .d-filters-divider { display: none; }
        }

        /* Banner */
        .d-banner-pend {
          background: rgba(201,110,75,.08);
          border: 1px solid rgba(201,110,75,.2);
          border-radius: 8px;
          padding: 7px 12px;
          font-size: 10px;
          color: var(--tw-text);
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .d-banner-pend a { color: var(--tw-terra); font-weight: 700; text-decoration: none; cursor: pointer; }

        /* Cards de Producto */
        .sc-product-card {
          background: var(--tw-card);
          border: 1px solid var(--tw-border);
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, border-color .15s;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .sc-product-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(201,110,75,.2);
          border-color: var(--tw-terra);
        }
        .sc-photo {
          height: 80px;
          background: linear-gradient(135deg, #2a1810, #1a0f08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          position: relative;
        }
        .sc-sca-badge {
          position: absolute;
          top: 6px;
          left: 6px;
          background: rgba(10,5,2,.85);
          border: 1px solid rgba(201,110,75,.4);
          border-radius: 6px;
          padding: 2px 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1.1;
        }
        .sc-sca-pts { font-size: 12px; font-weight: 700; color: #fff; font-family: var(--tw-font-display); }
        .sc-sca-label { font-size: 7px; color: #a89080; font-weight: 700; }

        .proc-chip {
          position: absolute;
          top: 6px;
          right: 6px;
          border-radius: 5px;
          padding: 2px 6px;
          font-size: 8px;
          font-weight: 700;
          color: #fff;
        }
        .tipo-chip {
          position: absolute;
          top: 6px;
          left: 6px;
          border-radius: 5px;
          padding: 2px 6px;
          font-size: 8px;
          font-weight: 700;
          color: #fff;
        }
        .proc-lavado  { background: #4a90c4; }
        .proc-natural { background: #c96e4b; }
        .proc-honey   { background: #d4a017; }
        .proc-anaerobico { background: #7c5cbf; }
        .tipo-verde   { background: #4a7c59; }
        .tipo-tostado { background: #7a4f28; }
        .tipo-molido  { background: #8b6914; }

        .sc-info { padding: 8px 10px; display: flex; flex-direction: column; flex: 1; }
        .sc-name { font-size: 11px; font-weight: 700; color: var(--tw-text); line-height: 1.2; margin-bottom: 2px; }
        .sc-caf { font-size: 9px; color: var(--tw-terra); font-weight: 600; margin-bottom: 2px; }
        .sc-notes { font-size: 9px; color: var(--tw-text-muted); margin-bottom: 5px; flex: 1; }
        .sc-badges { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 5px; }
        .sc-badge {
          font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap;
        }
        .sc-badge-excepcional { background: rgba(143,175,138,.18); color: #8faf8a; border: 1px solid rgba(143,175,138,.3); }
        .sc-badge-muybueno    { background: rgba(74,144,196,.15);  color: #4a90c4; border: 1px solid rgba(74,144,196,.3); }
        .sc-badge-bueno       { background: rgba(201,110,75,.12);  color: #c96e4b; border: 1px solid rgba(201,110,75,.25); }
        .sc-badge-negociable  { background: rgba(143,175,138,.15); color: #8faf8a; border: 1px solid rgba(143,175,138,.3); }
        .sc-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
        .sc-price { font-size: 13px; font-weight: 700; color: var(--tw-text); }
        .sc-price-sub { font-size: 8px; color: var(--tw-text-muted); }
        .sc-add-btn {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          background: var(--tw-terra);
          color: #fff;
          border: none;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background .2s, transform .1s;
          flex-shrink: 0;
        }
        .sc-add-btn:active { transform: scale(.88); }
        .sc-add-btn.in-cart {
          background: var(--tw-sage, #8faf8a);
          font-size: 13px;
          animation: checkPop .3s cubic-bezier(.34,1.56,.64,1) both;
        }
        @keyframes checkPop {
          0%   { transform: scale(.6); opacity: .6; }
          60%  { transform: scale(1.25); }
          100% { transform: scale(1);   opacity: 1; }
        }

        /* Panel pedidos */
        .d-pedidos-panel {
          width: 230px;
          flex-shrink: 0;
          margin-left: 12px;
        }
        .pend-card {
          background: var(--tw-card);
          border: 1px solid var(--tw-border);
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 8px;
          transition: all .2s;
        }
        .pend-card.highlight {
          border-color: var(--tw-terra);
          background: rgba(201,110,75,.05);
        }
        .pend-status-label {
          font-size: 9px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 4px;
          display: inline-block;
          margin-top: 4px;
        }
        .pend-preparing { background: rgba(217,119,6,.12); color: #d97706; }
        .pend-transit { background: rgba(59,130,246,.12); color: #3b82f6; }
        .pend-delivered { background: rgba(143,175,138,.15); color: var(--tw-sage); }
        .pend-waiting { background: rgba(201,110,75,.12); color: var(--tw-terra); }

        .pedido-step { flex: 1; height: 4px; border-radius: 2px; background: var(--tw-border); transition: background .4s; }
        .pedido-step.done { background: var(--tw-sage); }
        .pedido-step.active { background: var(--tw-terra); animation: ppulse 1.5s infinite; }
        @keyframes ppulse { 0%,100%{opacity:1} 50%{opacity:.5} }

        /* Footer */
        .d-footer {
          border-top: 1px solid var(--tw-border);
          padding: 16px 24px 20px;
          background: var(--tw-bg);
          font-size: 11px;
          flex-shrink: 0;
        }
        .d-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          align-items: center;
          width: 100%;
          justify-content: space-between;
        }
        .d-footer-link {
          color: var(--tw-text-muted);
          text-decoration: none;
          font-size: 10px;
          cursor: pointer;
          transition: color .12s;
        }
        .d-footer-link:hover { color: var(--tw-text); }
        .d-footer-contact {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 8px;
          color: var(--tw-text-muted);
          font-size: 10px;
        }
        .d-footer-divider { width: 1px; height: 12px; background: var(--tw-border); flex-shrink: 0; }
        .d-footer-copy { font-size: 9px; color: var(--tw-text-muted); }
        @media (max-width: 768px) {
          .d-footer { display: none; }
        }

        /* Drawer overlay & panel */
        .app-drawer-ov {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100;
          transition: opacity .25s ease;
        }
        .app-drawer {
          position: fixed; top: 0; left: 0; bottom: 0; width: 240px; z-index: 101;
          background: var(--tw-bg); border-right: 1px solid var(--tw-border);
          display: flex; flex-direction: column; padding: 18px;
          transform: translateX(-100%); transition: transform .25s cubic-bezier(.4,0,.2,1);
        }
        .app-drawer.open { transform: translateX(0); }

        /* Toast */
        .sim-toast {
          position: fixed; bottom: 20px; right: 20px;
          background: var(--tw-card); border: 1px solid var(--tw-border);
          border-radius: 10px; padding: 10px 16px; font-size: 11px; font-weight: 600;
          color: var(--tw-text); box-shadow: 0 4px 20px rgba(0,0,0,.25); z-index: 999;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .d-pedidos-panel { display: none; }
        }

        /* Detalle producto inline (embeddedMode) */
        .detalle-inline-grid { display: grid; grid-template-columns: 1fr 300px; gap: 24px; align-items: flex-start; }
        .detalle-inline-panel { position: sticky; top: calc(var(--header-h, 52px) + 16px); }
        @media (max-width: 700px) {
          .detalle-inline-grid { display: block; }
          .detalle-inline-panel { position: static; }
        }
        /* Detalle overlay (ruta /) */
        .detalle-desktop { display: block; }
        .detalle-mobile  { display: none; }
        @media (max-width: 700px) {
          .detalle-desktop { display: none; }
          .detalle-mobile  { display: flex; }
        }

        /* Bottom Nav Mobile */
        .bn-bar {
          display: none;
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 90;
          height: 60px;
          background: var(--tw-bg);
          border-top: 1px solid var(--tw-border);
          padding: 0 8px env(safe-area-inset-bottom, 0px);
          align-items: center; justify-content: space-around;
        }
        @media (max-width: 768px) {
          .bn-bar { display: flex; }
          .sim-toast { bottom: 72px; }
          main { padding-bottom: 60px; }
        }
        .bn-item {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 2px; flex: 1; height: 100%;
          background: none; border: none; cursor: pointer;
          color: var(--tw-text-muted);
          text-decoration: none; font-size: 9px; font-weight: 500;
          transition: color .12s;
          padding: 0; min-width: 0;
        }
        .bn-item.active, .bn-item:hover { color: var(--tw-terra); }
        .bn-icon { font-size: 20px; line-height: 1; }
        .bn-badge {
          position: absolute; top: 6px; right: calc(50% - 18px);
          background: var(--tw-terra); color: #fff;
          border-radius: 10px; min-width: 16px; height: 16px;
          font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center;
          padding: 0 4px; pointer-events: none;
        }

        /* Panel estadísticas en propuesta de valor: oculto en mobile */
        .cat-stats-panel { width: 180px; flex-shrink: 0; }
        @media (max-width: 600px) { .cat-stats-panel { display: none; } }

        /* Grid de regiones: 6 col desktop → 3 col mobile */
        .cat-regiones-grid { grid-template-columns: repeat(6, 1fr); }
        @media (max-width: 600px) { .cat-regiones-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>

      <div className="tw-app-shell">

        {/* ── DRAWER LATERAL ── */}
        {!embeddedMode && appDrawerOpen && (
          <div className="app-drawer-ov" onClick={() => setAppDrawerOpen(false)} />
        )}
        {!embeddedMode && (<div className={`app-drawer ${appDrawerOpen ? 'open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--tw-font-display)', fontSize: 18, fontWeight: 700, color: 'var(--tw-text)' }}>
              Tunay · Wasi
            </div>
            <button onClick={() => setAppDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--tw-text-muted)' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href="/" onClick={() => setAppDrawerOpen(false)} style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(201,110,75,.08)', color: 'var(--tw-terra)', textDecoration: 'none', fontWeight: 700, fontSize: 12 }}>☕ Catálogo</a>
            {rolUsuario === 'buyer_b2b' || rolUsuario === 'buyer_b2c' || rolUsuario === 'admin' ? (
              <>
                <a href="/portal" onClick={() => setAppDrawerOpen(false)} style={{ padding: '8px 10px', borderRadius: 6, color: 'var(--tw-text)', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>🏪 Mi Portal</a>
                <a href="/portal" onClick={() => setAppDrawerOpen(false)} style={{ padding: '8px 10px', borderRadius: 6, color: 'var(--tw-text)', textDecoration: 'none', fontSize: 12 }}>📦 Mis Compras</a>
              </>
            ) : rolUsuario === 'seller' ? (
              <>
                <a href="/caficultor-portal" onClick={() => setAppDrawerOpen(false)} style={{ padding: '8px 10px', borderRadius: 6, color: 'var(--tw-sage)', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>🌱 Mi Portal</a>
                <a href="/caficultor-portal" onClick={() => setAppDrawerOpen(false)} style={{ padding: '8px 10px', borderRadius: 6, color: 'var(--tw-text)', textDecoration: 'none', fontSize: 12 }}>📦 Mis Ventas</a>
              </>
            ) : (
              <>
                <a href="/portal" onClick={() => setAppDrawerOpen(false)} style={{ padding: '8px 10px', borderRadius: 6, color: 'var(--tw-text)', textDecoration: 'none', fontSize: 12 }}>📦 Mis Compras</a>
                <a href="/para-cafeterias" onClick={() => setAppDrawerOpen(false)} style={{ padding: '8px 10px', borderRadius: 6, color: 'var(--tw-terra)', textDecoration: 'none', fontSize: 12 }}>☕ Soy Negocio</a>
              </>
            )}
            <a href="/docs" onClick={() => setAppDrawerOpen(false)} style={{ padding: '8px 10px', borderRadius: 6, color: 'var(--tw-text)', textDecoration: 'none', fontSize: 12 }}>📄 Documentación</a>
            <a href="/soporte" onClick={() => setAppDrawerOpen(false)} style={{ padding: '8px 10px', borderRadius: 6, color: 'var(--tw-text)', textDecoration: 'none', fontSize: 12 }}>❓ Preguntas frecuentes</a>
          </div>
          {/* Theme switcher en drawer */}
          <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--tw-border)', marginBottom: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Apariencia</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {([
                { key: 'cream' as const, label: 'Crema',  bg: '#f2e0cc' },
                { key: 'dark'  as const, label: 'Oscuro', bg: '#141414' },
                { key: 'white' as const, label: 'Blanco', bg: '#f5f5f5' },
              ]).map(({ key, label, bg }) => (
                <button
                  key={key}
                  onClick={() => { cambiarTema(key); setAppDrawerOpen(false); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: bg,
                    border: temaActual === key ? '2.5px solid var(--tw-terra)' : '1.5px solid var(--tw-border)',
                    transform: temaActual === key ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.15s, border-color 0.15s',
                    boxShadow: temaActual === key ? '0 0 0 3px rgba(201,110,75,0.15)' : 'none',
                  }} />
                  <span style={{ fontSize: 8, color: temaActual === key ? 'var(--tw-terra)' : 'var(--tw-text-muted)', fontWeight: temaActual === key ? 700 : 400 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ paddingTop: 14, borderTop: '1px solid var(--tw-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--tw-terra)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
              {userNombre ? userNombre.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              {userNombre ? (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-text)' }}>{userNombre}</div>
                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>{rolUsuario === 'seller' ? 'Caficultor' : rolUsuario === 'buyer_b2b' ? 'Negocio B2B' : rolUsuario === 'buyer_b2c' ? 'Consumidor' : rolUsuario === 'admin' ? 'Admin' : ''}</div>
                </>
              ) : (
                <>
                  <a href="/login" onClick={() => setAppDrawerOpen(false)} style={{ fontSize: 11, fontWeight: 600, color: 'var(--tw-terra)', textDecoration: 'none' }}>Iniciar sesión</a>
                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>Para acceder a tu cuenta</div>
                </>
              )}
            </div>
          </div>
        </div>)}

        {/* ── HEADER SUPERIOR ── */}
        {!embeddedMode && <header className="d-header">
          <button className="app-ham-btn" onClick={() => setAppDrawerOpen(true)} title="Menú">☰</button>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tw-text)', fontFamily: 'var(--tw-font-display)', whiteSpace: 'nowrap' }}>
            Tunay · Wasi
          </div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 20, background: 'rgba(201,110,75,.08)', border: '1px solid rgba(201,110,75,.2)', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => showToast('📍 Cobertura actual: Lima Metropolitana')}
          >
            <span style={{ fontSize: 12 }}>📍</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-terra)' }}>Lima, Perú</span>
            <span style={{ fontSize: 8, color: 'var(--tw-text-muted)' }}>▾</span>
          </div>
          <input
            className="frame-search"
            placeholder="🔎  Buscar café, variedad, región..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {/* Theme switcher */}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', margin: '0 6px', flexShrink: 0 }}>
            {(['cream', 'dark', 'white'] as const).map(t => (
              <div
                key={t}
                onClick={() => cambiarTema(t)}
                title={t === 'cream' ? 'Tema crema' : t === 'dark' ? 'Tema oscuro' : 'Tema blanco'}
                style={{
                  width: 18, height: 18, borderRadius: '50%', cursor: 'pointer',
                  border: temaActual === t ? '2px solid var(--tw-terra)' : '1.5px solid var(--tw-border)',
                  background: t === 'cream' ? '#f2e0cc' : t === 'dark' ? '#141414' : '#f5f5f5',
                  transform: temaActual === t ? 'scale(1.25)' : 'scale(1)',
                  transition: 'transform 0.15s, border-color 0.15s',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
          {/* Cart Icon */}
          <div style={{ position: 'relative', cursor: 'pointer', padding: '0 4px', flexShrink: 0 }} onClick={onIrAlCheckout}>
            <span style={{ fontSize: 18 }}>🛒</span>
            {carritoCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--tw-terra)', color: '#fff', fontSize: 8, fontWeight: 700, borderRadius: 8, padding: '1px 5px', minWidth: 14, textAlign: 'center' }}>{carritoCount}</span>
            )}
          </div>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--tw-card)', border: '1px solid var(--tw-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--tw-text)', flexShrink: 0 }}>D</div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => irALogin({ registro: true })} style={{ padding: '5px 11px', borderRadius: 7, border: '1px solid var(--tw-terra)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--tw-font-body)' }}>Registrarse</button>
            <a href="/portal" onClick={(e) => { e.preventDefault(); navigate('/portal') }} style={{ padding: '5px 11px', borderRadius: 7, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--tw-font-body)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Mi portal</a>
          </div>
        </header>}

        {/* ── CONTENIDO PRINCIPAL (2 Columnas) ── */}
        <main style={{ flex: 1, padding: '14px 18px 40px', maxWidth: 1380, margin: '0 auto', width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>

          {/* Banner de pedido activo */}
          {rolUsuario && pedidos.length > 0 && (() => {
            const activo = pedidos.find(p => !p.cancelado && p.logisticaStatus !== 'entregado') ?? pedidos[0]
            const item = activo.items[0]
            const resumen = item ? `${item.productoNombre} × ${item.qty} ${item.presentacion}` : activo.id
            return (
              <div className="d-banner-pend">
                <span>⏳ {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} · <strong>{resumen}</strong></span>
                <a href="/portal" onClick={(e) => { e.preventDefault(); navigate('/portal') }} style={{ color: 'var(--tw-terra)', fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>Ver →</a>
              </div>
            )
          })()}

          {/* Banner PENDING_APPROVAL B2B — US-10 */}
          {rolUsuario === 'buyer_b2b' && estadoAprobacionB2B === 'PENDING_APPROVAL' && (
            <div style={{
              background: 'rgba(232,184,75,0.12)', border: '1px solid rgba(232,184,75,0.35)',
              borderRadius: 10, padding: '10px 16px', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 16 }}>⏳</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#e8b84b', fontFamily: 'var(--tw-font-body)' }}>
                  Tu cuenta de empresa está en revisión por el equipo de TunayWasi
                </div>
                <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'var(--tw-font-body)', marginTop: 2 }}>
                  Mientras tanto puedes explorar el catálogo. Los precios mayoristas (S/kg) y cotizaciones estarán disponibles una vez aprobada tu cuenta.
                </div>
              </div>
            </div>
          )}

          {/* Banner REJECTED B2B */}
          {rolUsuario === 'buyer_b2b' && estadoAprobacionB2B === 'REJECTED' && (
            <div style={{
              background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '10px 16px', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>❌</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', fontFamily: 'var(--tw-font-body)' }}>Solicitud de empresa rechazada</div>
                <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', fontFamily: 'var(--tw-font-body)', marginTop: 2 }}>
                  Contacta a soporte en TunayWasi para más información.
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>

            {/* COLUMNA IZQUIERDA: Catálogo */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {!hideFiltersHeader && (<>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--tw-text)' }}>Cafés disponibles</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}><span>{cafésFiltrados.length}</span> resultados</div>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--tw-border)', background: 'var(--tw-card)', color: 'var(--tw-text)', cursor: 'pointer', fontFamily: 'var(--tw-font-body)' }}>
                    <option value="relevancia">Relevancia</option>
                    <option value="recientes">Más recientes</option>
                    <option value="precio_asc">Precio: menor a mayor</option>
                    <option value="precio_desc">Precio: mayor a menor</option>
                    <option value="evidencia">Mayor evidencia</option>
                  </select>
                </div>
              </div>
              <div className="d-filters-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                <button className={`d-fchip ${regionFilter === 'all' ? 'active' : ''}`} onClick={() => setRegionFilter('all')}>Todos</button>
                <button className={`d-fchip ${regionFilter === 'Cajamarca' ? 'active' : ''}`} onClick={() => setRegionFilter('Cajamarca')}>Cajamarca</button>
                <button className={`d-fchip ${regionFilter === 'Cusco' ? 'active' : ''}`} onClick={() => setRegionFilter('Cusco')}>Cusco</button>
                <button className={`d-fchip ${regionFilter === 'Puno' ? 'active' : ''}`} onClick={() => setRegionFilter('Puno')}>Puno</button>
                <button className={`d-fchip ${regionFilter === 'San Martín' ? 'active' : ''}`} onClick={() => setRegionFilter('San Martín')}>San Martín</button>
                <div className="d-filters-divider" style={{ width: 1, background: 'var(--tw-border)', margin: '0 2px' }} />
                <button className={`d-fchip ${procesoFilter === 'all' ? 'active' : ''}`} onClick={() => setProcesoFilter('all')}>Todo proceso</button>
                <button className={`d-fchip ${procesoFilter === 'Lavado' ? 'active' : ''}`} onClick={() => setProcesoFilter('Lavado')}>Lavado</button>
                <button className={`d-fchip ${procesoFilter === 'Natural' ? 'active' : ''}`} onClick={() => setProcesoFilter('Natural')}>Natural</button>
                <button className={`d-fchip ${procesoFilter === 'Honey' ? 'active' : ''}`} onClick={() => setProcesoFilter('Honey')}>Honey</button>
                <div className="d-filters-divider" style={{ width: 1, background: 'var(--tw-border)', margin: '0 2px' }} />
                <button className={`d-fchip ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>Todo tipo</button>
                <button className={`d-fchip ${typeFilter === 'TYPE_A' ? 'active' : ''}`} onClick={() => setTypeFilter('TYPE_A')} title="Café verde · Solo compra B2B aprobado">🌿 Verde</button>
                <button className={`d-fchip ${typeFilter === 'TYPE_B' ? 'active' : ''}`} onClick={() => setTypeFilter('TYPE_B')} title="Café tostado en grano">☕ Tostado</button>
                <button className={`d-fchip ${typeFilter === 'TYPE_C' ? 'active' : ''}`} onClick={() => setTypeFilter('TYPE_C')} title="Café tostado y molido">🫘 Molido</button>
              </div>
              {/* Filtros de perfil de taza — sin filtro por evidencia (spec §8: nivel de evidencia NO es filtro de catálogo) */}
              <div className="d-filters-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                <button className={`d-fchip ${saboresFilter === 'all' ? 'active' : ''}`} onClick={() => setSaboresFilter('all')}>Todo perfil</button>
                <button className={`d-fchip ${saboresFilter === 'floral' ? 'active' : ''}`} onClick={() => setSaboresFilter('floral')}>🌸 Floral</button>
                <button className={`d-fchip ${saboresFilter === 'frutal' ? 'active' : ''}`} onClick={() => setSaboresFilter('frutal')}>🍓 Frutal</button>
                <button className={`d-fchip ${saboresFilter === 'chocolate' ? 'active' : ''}`} onClick={() => setSaboresFilter('chocolate')}>🍫 Chocolate</button>
                <button className={`d-fchip ${saboresFilter === 'caramelo' ? 'active' : ''}`} onClick={() => setSaboresFilter('caramelo')}>🍯 Caramelo</button>
              </div>
              {/* Etiquetas de filtros activos */}
              {hayFiltrosActivos && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: 'var(--tw-text-muted)', fontFamily: 'var(--tw-font-body)' }}>Activos:</span>
                  {regionFilter !== 'all' && <span className="d-fchip active" style={{ cursor: 'default' }}>{regionFilter} <span onClick={() => setRegionFilter('all')} style={{ cursor: 'pointer', marginLeft: 4 }}>×</span></span>}
                  {procesoFilter !== 'all' && <span className="d-fchip active" style={{ cursor: 'default' }}>{procesoFilter} <span onClick={() => setProcesoFilter('all')} style={{ cursor: 'pointer', marginLeft: 4 }}>×</span></span>}
                  {typeFilter !== 'all' && <span className="d-fchip active" style={{ cursor: 'default' }}>{typeFilter === 'TYPE_A' ? '🌿 Verde' : typeFilter === 'TYPE_B' ? '☕ Tostado' : '🫘 Molido'} <span onClick={() => setTypeFilter('all')} style={{ cursor: 'pointer', marginLeft: 4 }}>×</span></span>}
                  {saboresFilter !== 'all' && <span className="d-fchip active" style={{ cursor: 'default' }}>{saboresFilter} <span onClick={() => setSaboresFilter('all')} style={{ cursor: 'pointer', marginLeft: 4 }}>×</span></span>}
                  {search && <span className="d-fchip active" style={{ cursor: 'default' }}>"{search}" <span onClick={() => setSearch('')} style={{ cursor: 'pointer', marginLeft: 4 }}>×</span></span>}
                  <button onClick={() => { setRegionFilter('all'); setProcesoFilter('all'); setTypeFilter('all'); setSaboresFilter('all'); setSearch('') }}
                    style={{ fontSize: 9, color: 'var(--tw-terra)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--tw-font-body)', padding: '2px 4px', textDecoration: 'underline' }}>
                    Limpiar todos
                  </button>
                </div>
              )}
              </>)}

              {/* ── Estado vacío US-47 ── */}
              {cafésFiltrados.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--tw-text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 6, fontFamily: 'var(--tw-font-body)' }}>Sin resultados para esta combinación</div>
                  {filtroMasRestrictivo ? (
                    <div style={{ fontSize: 12, fontFamily: 'var(--tw-font-body)' }}>
                      Prueba quitar el filtro de {filtroMasRestrictivo.label} para encontrar más cafés.{' '}
                      <button onClick={filtroMasRestrictivo.limpiar} style={{ background: 'none', border: 'none', color: 'var(--tw-terra)', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'var(--tw-font-body)', textDecoration: 'underline' }}>
                        Quitar filtro
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, fontFamily: 'var(--tw-font-body)' }}>Aún no hay cafés disponibles. Vuelve pronto.</div>
                  )}
                </div>
              )}

              {/* ── ROW: LAVADO ── */}
              {cafesLavado.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 14 }}>☕</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>Lavado</span>
                      <span style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>· Claridad · acidez brillante</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => scrollRow(lavadoRef, 'left')} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--tw-border)', background: 'var(--tw-card)', cursor: 'pointer', fontSize: 11, color: 'var(--tw-text)' }}>‹</button>
                      <button onClick={() => scrollRow(lavadoRef, 'right')} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--tw-border)', background: 'var(--tw-card)', cursor: 'pointer', fontSize: 11, color: 'var(--tw-text)' }}>›</button>
                    </div>
                  </div>
                  <div ref={lavadoRef} style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: '160px', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none', minWidth: 0 }}>
                    {cafesLavado.map(c => (
                      <div key={c.id} className="sc-product-card" onClick={() => handleCardClick(c)}>
                        <div className="sc-photo">
                          <span>{c.emoji}</span>
                          <span className={`tipo-chip tipo-${c.productType === 'TYPE_A' ? 'verde' : c.productType === 'TYPE_B' ? 'tostado' : 'molido'}`}>{TIPO_LABEL[c.productType]}</span>
                          <span className={`proc-chip proc-${(c.proceso || '').toLowerCase().replace(/é/g,'e').replace(/ó/g,'o') || 'lavado'}`}>{c.proceso}</span>
                        </div>
                        <div className="sc-info">
                          <div className="sc-name" title={c.nombre}>{c.nombre}</div>
                          <div className="sc-caf">{c.caf} · {c.region}</div>
                          <div className="sc-notes">{c.notas}</div>
                          <div className="sc-footer">
                            <div>
                              {c.pricingMode === 'NEGOTIABLE'
                                ? <><span className="sc-badge sc-badge-negociable">A negociar</span><span className="sc-price-sub" style={{ display: 'block', fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 2 }}>Ref. S/ {c.precio.toFixed(0)}/kg</span></>
                                : <><span className="sc-price">S/ {c.precio.toFixed(2)}</span><span className="sc-price-sub"> /kg</span></>
                              }
                            </div>
                            {renderAddBtn(c)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ROW: NATURAL ── */}
              {cafesNatural.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 14 }}>🫘</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>Natural</span>
                      <span style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>· Cuerpo · frutas intensas</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => scrollRow(naturalRef, 'left')} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--tw-border)', background: 'var(--tw-card)', cursor: 'pointer', fontSize: 11, color: 'var(--tw-text)' }}>‹</button>
                      <button onClick={() => scrollRow(naturalRef, 'right')} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--tw-border)', background: 'var(--tw-card)', cursor: 'pointer', fontSize: 11, color: 'var(--tw-text)' }}>›</button>
                    </div>
                  </div>
                  <div ref={naturalRef} style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: '160px', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none', minWidth: 0 }}>
                    {cafesNatural.map(c => (
                      <div key={c.id} className="sc-product-card" onClick={() => handleCardClick(c)}>
                        <div className="sc-photo">
                          <span>{c.emoji}</span>
                          <span className={`tipo-chip tipo-${c.productType === 'TYPE_A' ? 'verde' : c.productType === 'TYPE_B' ? 'tostado' : 'molido'}`}>{TIPO_LABEL[c.productType]}</span>
                          <span className={`proc-chip proc-${(c.proceso || '').toLowerCase().replace(/é/g,'e').replace(/ó/g,'o') || 'lavado'}`}>{c.proceso}</span>
                        </div>
                        <div className="sc-info">
                          <div className="sc-name" title={c.nombre}>{c.nombre}</div>
                          <div className="sc-caf">{c.caf} · {c.region}</div>
                          <div className="sc-notes">{c.notas}</div>
                          <div className="sc-footer">
                            <div>
                              {c.pricingMode === 'NEGOTIABLE'
                                ? <><span className="sc-badge sc-badge-negociable">A negociar</span><span className="sc-price-sub" style={{ display: 'block', fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 2 }}>Ref. S/ {c.precio.toFixed(0)}/kg</span></>
                                : <><span className="sc-price">S/ {c.precio.toFixed(2)}</span><span className="sc-price-sub"> /kg</span></>
                              }
                            </div>
                            {renderAddBtn(c)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ROW: HONEY ── */}
              {cafesHoney.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 14 }}>🍯</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>Honey</span>
                      <span style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>· Dulzor · notas suaves</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => scrollRow(honeyRef, 'left')} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--tw-border)', background: 'var(--tw-card)', cursor: 'pointer', fontSize: 11, color: 'var(--tw-text)' }}>‹</button>
                      <button onClick={() => scrollRow(honeyRef, 'right')} style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid var(--tw-border)', background: 'var(--tw-card)', cursor: 'pointer', fontSize: 11, color: 'var(--tw-text)' }}>›</button>
                    </div>
                  </div>
                  <div ref={honeyRef} style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: '160px', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none', minWidth: 0 }}>
                    {cafesHoney.map(c => (
                      <div key={c.id} className="sc-product-card" onClick={() => handleCardClick(c)}>
                        <div className="sc-photo">
                          <span>{c.emoji}</span>
                          <span className={`tipo-chip tipo-${c.productType === 'TYPE_A' ? 'verde' : c.productType === 'TYPE_B' ? 'tostado' : 'molido'}`}>{TIPO_LABEL[c.productType]}</span>
                          <span className={`proc-chip proc-${(c.proceso || '').toLowerCase().replace(/é/g,'e').replace(/ó/g,'o') || 'lavado'}`}>{c.proceso}</span>
                        </div>
                        <div className="sc-info">
                          <div className="sc-name" title={c.nombre}>{c.nombre}</div>
                          <div className="sc-caf">{c.caf} · {c.region}</div>
                          <div className="sc-notes">{c.notas}</div>
                          <div className="sc-footer">
                            <div>
                              {c.pricingMode === 'NEGOTIABLE'
                                ? <><span className="sc-badge sc-badge-negociable">A negociar</span><span className="sc-price-sub" style={{ display: 'block', fontSize: 9, color: 'var(--tw-text-muted)', marginTop: 2 }}>Ref. S/ {c.precio.toFixed(0)}/kg</span></>
                                : <><span className="sc-price">S/ {c.precio.toFixed(2)}</span><span className="sc-price-sub"> /kg</span></>
                              }
                            </div>
                            {renderAddBtn(c)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── CAFICULTORES DESTACADOS + banner + regiones ── */}
              {!hideFiltersHeader && <><div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--tw-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)' }}>Caficultores destacados</div>
                  <a href="/caficultores" onClick={(e) => { e.preventDefault(); navigate('/caficultores') }} style={{ fontSize: 10, color: 'var(--tw-terra)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</a>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  {loading ? (
                    <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', padding: '8px 0' }}>Cargando…</div>
                  ) : Array.from(caficultores.values()).filter(c => c.activo).slice(0, 3).length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', padding: '8px 0' }}>Próximamente</div>
                  ) : Array.from(caficultores.values()).filter(c => c.activo).slice(0, 3).map(c => {
                    const lotesCount = productos.filter(p => p.caficultorId === c.id && p.status === 'activo').length
                    return (
                      <div key={c.id} style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#c96e4b,#8faf8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>☕</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-text)' }}>{c.nombre}</div>
                          <div style={{ fontSize: 9, color: 'var(--tw-terra)', fontWeight: 600 }}>{c.region} · {lotesCount} lote{lotesCount !== 1 ? 's' : ''}</div>
                        </div>
                        {c.scoreConfianza != null && (
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text)' }}>⭐ {c.scoreConfianza.toFixed(1)}</div>
                            <div style={{ fontSize: 8, color: 'var(--tw-text-muted)' }}>{c.totalCalificaciones ?? 0} reseñas</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── PROPUESTA DE VALOR ── */}
              <div style={{ marginTop: 20, padding: 18, background: 'linear-gradient(135deg,rgba(201,110,75,.08),rgba(143,175,138,.06))', border: '1px solid rgba(201,110,75,.2)', borderRadius: 12 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--tw-font-display)', fontSize: 18, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 4 }}>
                      Café de especialidad <span style={{ color: 'var(--tw-terra)' }}>directo del productor</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
                      Conectamos emprendedores con caficultores peruanos certificados. Sin intermediarios, con trazabilidad completa y pago seguro a través de escrow.
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[['🔒','Pago escrow','Tu dinero seguro'],['📜','Certificado SCA','Calidad verificada'],['🚚','Envío rastreado','Shalom · Olva · Hub']].map(([ico, t, s]) => (
                        <div key={t} style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{ico}</span>
                          <div><div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-text)' }}>{t}</div><div style={{ fontSize: 8, color: 'var(--tw-text-muted)' }}>{s}</div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="cat-stats-panel" style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 8 }}>📊 Estadísticas</div>
                    {(() => {
                      const activos = productos.filter(p => p.status === 'activo')
                      const nCafics = caficultores.size
                      const nLotes = activos.length
                      const nRegiones = new Set(Array.from(caficultores.values()).map(c => c.region)).size
                      const lavados = activos.filter(p => p.proceso === 'lavado')
                      const naturales = activos.filter(p => p.proceso === 'natural')
                      const avgLavado = lavados.length ? Math.round(lavados.reduce((s, p) => s + p.precioBaseKgCents, 0) / lavados.length / 100) : null
                      const avgNatural = naturales.length ? Math.round(naturales.reduce((s, p) => s + p.precioBaseKgCents, 0) / naturales.length / 100) : null
                      const maxAvg = Math.max(avgLavado ?? 0, avgNatural ?? 0) || 1
                      return <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--tw-border)' }}>
                          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tw-terra)' }}>{nCafics}</div><div style={{ fontSize: 8, color: 'var(--tw-text-muted)' }}>Caficultores</div></div>
                          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tw-terra)' }}>{nLotes}</div><div style={{ fontSize: 8, color: 'var(--tw-text-muted)' }}>Lotes</div></div>
                          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tw-terra)' }}>{nRegiones}</div><div style={{ fontSize: 8, color: 'var(--tw-text-muted)' }}>Regiones</div></div>
                        </div>
                        {(avgLavado || avgNatural) && <>
                          <div style={{ fontSize: 8, color: 'var(--tw-text-muted)', marginBottom: 4 }}>Precio promedio / kg</div>
                          {avgLavado != null && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                            <span style={{ fontSize: 8, color: 'var(--tw-text-muted)', width: 44 }}>Lavado</span>
                            <div style={{ flex: 1, height: 4, background: 'var(--tw-border)', borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${Math.round(avgLavado / maxAvg * 100)}%`, height: '100%', background: 'var(--tw-terra)' }} /></div>
                            <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--tw-text)' }}>S/{avgLavado}</span>
                          </div>}
                          {avgNatural != null && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 8, color: 'var(--tw-text-muted)', width: 44 }}>Natural</span>
                            <div style={{ flex: 1, height: 4, background: 'var(--tw-border)', borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${Math.round(avgNatural / maxAvg * 100)}%`, height: '100%', background: 'var(--tw-sage)' }} /></div>
                            <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--tw-text)' }}>S/{avgNatural}</span>
                          </div>}
                        </>}
                      </>
                    })()}
                  </div>
                </div>
              </div>

              {/* ── REGIONES PRODUCTORAS ── */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--tw-border)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 10 }}>Regiones productoras</div>
                <div className="cat-regiones-grid" style={{ display: 'grid', gap: 8 }}>
                  {(() => {
                    const REGION_ICONS: Record<string, string> = { 'Cajamarca': '🏔️', 'Cusco': '🌿', 'Puno': '🌄', 'San Martín': '🌺', 'Huánuco': '⛰️', 'Amazonas': '🌳', 'Junín': '🏞️', 'Ayacucho': '🌾' }
                    const regionMap = new Map<string, number>()
                    productos.filter(p => p.status === 'activo').forEach(p => {
                      const caf = caficultores.get(p.caficultorId ?? '')
                      if (caf?.region) regionMap.set(caf.region, (regionMap.get(caf.region) ?? 0) + 1)
                    })
                    if (regionMap.size === 0) return <div style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>Próximamente</div>
                    return Array.from(regionMap.entries()).map(([name, count]) => (
                      <div key={name} onClick={() => setRegionFilter(name)} style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 8, padding: '8px 6px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s' }}>
                        <div style={{ fontSize: 18, marginBottom: 2 }}>{REGION_ICONS[name] ?? '📍'}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-text)' }}>{name}</div>
                        <div style={{ fontSize: 8, color: 'var(--tw-text-muted)' }}>{count} lote{count !== 1 ? 's' : ''}</div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
              </>}
            </div>{/* /columna izquierda */}

            {/* COLUMNA DERECHA: Mis Compras */}
            {!hideFiltersHeader && rolUsuario && <aside className="d-pedidos-panel">
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                Mis Compras
                {pedidos.length > 0 && <span style={{ background: 'var(--tw-terra)', color: '#fff', fontSize: 8, fontWeight: 700, borderRadius: 6, padding: '1px 5px' }}>{pedidos.length}</span>}
              </div>
              {loading ? (
                <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', padding: '8px 0' }}>Cargando…</div>
              ) : pedidos.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--tw-text-muted)', padding: '8px 0', textAlign: 'center', lineHeight: 1.5 }}>
                  Aún no tienes pedidos.<br />
                  <a href="/catalogo" onClick={(e) => { e.preventDefault(); navigate('/catalogo') }} style={{ color: 'var(--tw-terra)', fontWeight: 600, textDecoration: 'none' }}>Explorar catálogo →</a>
                </div>
              ) : pedidos.slice(0, 3).map((ped, i) => {
                const fase = ped.cancelado
                  ? { label: 'Cancelado', cls: 'pend-waiting' }
                  : ped.logisticaStatus === 'entregado'
                  ? { label: '¡Entregado!', cls: 'pend-delivered' }
                  : ped.logisticaStatus === 'en_agencia'
                  ? { label: 'En camino', cls: 'pend-transit' }
                  : ped.logisticaStatus === 'preparando'
                  ? { label: 'Preparando pedido', cls: 'pend-preparing' }
                  : ped.pagoStatus === 'verificado'
                  ? { label: 'Pago confirmado', cls: 'pend-transit' }
                  : ped.pagoStatus === 'voucher_subido'
                  ? { label: 'Verificando pago', cls: 'pend-preparing' }
                  : { label: 'Esperando voucher', cls: 'pend-waiting' }
                const primerItem = ped.items[0]
                return (
                  <div key={ped.id} className={`pend-card${i === 0 ? ' highlight' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text)', flex: 1, marginRight: 6 }}>
                        {primerItem ? `${primerItem.productoNombre} × ${primerItem.qty} ${primerItem.presentacion}` : ped.id}
                        {ped.items.length > 1 && <span style={{ color: 'var(--tw-text-muted)', fontWeight: 400 }}> +{ped.items.length - 1}</span>}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-terra)', flexShrink: 0 }}>S/ {(ped.totalCents / 100).toFixed(2)}</div>
                    </div>
                    {primerItem?.caficultorNombre && (
                      <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginBottom: 4 }}>{primerItem.caficultorNombre}</div>
                    )}
                    <div className={`pend-status-label ${fase.cls}`}>{fase.label}</div>
                  </div>
                )
              })}
              {carritoCount > 0 && (
                <div style={{ marginTop: 10, border: '1px solid var(--tw-terra)', borderRadius: 10, padding: 10, textAlign: 'center', background: 'var(--tw-card)' }}>
                  <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', marginBottom: 2 }}>Carrito actual ({carritoCount})</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tw-terra)' }}>S/ {(totalCarritoCents / 100).toFixed(2)}</div>
                  <button onClick={onIrAlCheckout} style={{ marginTop: 6, width: '100%', padding: '6px 10px', borderRadius: 7, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Ir al carrito →</button>
                </div>
              )}
            </aside>}

          </div>
        </main>

        {/* ── TOAST ── */}
        {toastMsg && <div className="sim-toast">{toastMsg}</div>}

        {/* ── MODAL REGISTRO ── */}

        {/* ── DRAWER DE DETALLE (ruta #/) ── */}
        {productoDetalle && (() => {
          const PROCESO_BADGE_LOCAL: Record<string, { bg: string; color: string; border: string; label: string }> = {
            lavado:    { bg: 'rgba(59,130,246,.12)',  color: '#60a5fa', border: 'rgba(59,130,246,.25)',  label: 'Lavado' },
            natural:   { bg: 'rgba(239,68,68,.12)',   color: '#f87171', border: 'rgba(239,68,68,.25)',   label: 'Natural' },
            honey:     { bg: 'rgba(245,158,11,.12)',  color: '#fbbf24', border: 'rgba(245,158,11,.25)',  label: 'Honey' },
            tostado:   { bg: 'rgba(143,175,138,.12)', color: 'var(--tw-sage)', border: 'rgba(143,175,138,.25)', label: 'Tostado' },
            anaerobic: { bg: 'rgba(167,139,250,.12)', color: '#a78bfa', border: 'rgba(167,139,250,.25)', label: 'Anaeróbico' },
          }
          const proc = PROCESO_BADGE_LOCAL[(productoDetalle.proceso || '').toLowerCase()] ?? { bg: 'var(--tw-card)', color: 'var(--tw-text-muted)', border: 'var(--tw-border)', label: productoDetalle.proceso }
          const crossSelling = productos.filter((p: ProductoONE) => p.caficultorId === productoDetalle.caficultorId && p.id !== productoDetalle.id).slice(0, 4)
          const precioKg = productoDetalle.precioBaseKgCents / 100
          const FORMATOS = [{ key: '250g', label: '250g', kgFactor: 0.25 }, { key: '500g', label: '500g', kgFactor: 0.5 }, { key: '1kg', label: '1 kg', kgFactor: 1 }, { key: '5kg', label: '5 kg', kgFactor: 5 }]
          const fmtActual = FORMATOS.find(f => f.key === detalleFormato) ?? FORMATOS[2]
          const precioUnitario = precioKg * fmtActual.kgFactor
          const precioTotal = precioUnitario * detalleCantidad
          const kgLabel = `${(fmtActual.kgFactor * detalleCantidad).toLocaleString('es', { maximumFractionDigits: 2 })} kg`

          const PanelAccion = ({ compact }: { compact?: boolean }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 10 : 12 }}>
              <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 12, padding: compact ? '12px 12px 14px' : '14px 14px 16px' }}>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: compact ? 22 : 26, fontWeight: 800, color: 'var(--tw-terra)' }}>S/ {precioUnitario.toFixed(2)}</span>
                  <span style={{ fontSize: 11, color: 'var(--tw-text-muted)', marginLeft: 4 }}>/ {fmtActual.label}</span>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tw-text-muted)', marginBottom: 6 }}>Selecciona el formato</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {FORMATOS.map(f => (
                    <button key={f.key} type="button" onClick={() => setDetalleFormato(f.key)} style={{ padding: '5px 10px', borderRadius: 7, cursor: 'pointer', border: `1px solid ${detalleFormato === f.key ? 'var(--tw-terra)' : 'var(--tw-border)'}`, background: detalleFormato === f.key ? 'var(--tw-terra)' : 'var(--tw-card)', color: detalleFormato === f.key ? '#fff' : 'var(--tw-text-muted)', fontSize: 10, fontWeight: 600, fontFamily: 'Montserrat, sans-serif' }}>
                      {f.label} · S/{(precioKg * f.kgFactor).toFixed(0)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: 11, color: 'var(--tw-text-muted)' }}>Cantidad</span>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--tw-border)', borderRadius: 8, overflow: 'hidden' }}>
                    <button type="button" onClick={() => setDetalleCantidad(c => Math.max(1, c - 1))} style={{ width: 32, height: 32, border: 'none', background: 'var(--tw-card)', color: 'var(--tw-text)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ padding: '0 14px', fontSize: 13, fontWeight: 700, color: 'var(--tw-text)', background: 'var(--tw-bg)' }}>{detalleCantidad}</span>
                    <button type="button" onClick={() => setDetalleCantidad(c => c + 1)} style={{ width: 32, height: 32, border: 'none', background: 'var(--tw-card)', color: 'var(--tw-text)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
                <button onClick={() => { onSeleccionar?.(productoDetalle, detalleFormato as FormatoONE); setProductoDetalle(null); showToast(`Agregado: ${productoDetalle.nombre} · ${kgLabel}`) }} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: 'var(--tw-terra)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Montserrat, sans-serif' }}>
                  <span>Agregar al carrito</span>
                  <span style={{ fontWeight: 800 }}>S/ {precioTotal.toFixed(2)}</span>
                </button>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tw-text-muted)', marginBottom: 6 }}>Vendido por</div>
                <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--tw-terra)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>{(productoDetalle.caficultorNombre || '?').charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)' }}>{productoDetalle.caficultorNombre}</div>
                    <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 1 }}>📍 {productoDetalle.caficultorRegion ?? 'Perú'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                      <span style={{ color: '#fbbf24', fontSize: 10 }}>★★★★★</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-text)' }}>4.8</span>
                      <span style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>(32 reseñas)</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--tw-terra)', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Ver perfil →</span>
                </div>
              </div>
              <div style={{ background: 'var(--tw-card)', border: '1px solid var(--tw-border)', borderRadius: 10, padding: '10px 12px' }}>
                {([
                  { label: 'Proceso', value: proc.label, color: undefined },
                  { label: 'Altitud', value: productoDetalle.altitudMsnm ? `${productoDetalle.altitudMsnm.toLocaleString()} msnm` : null, color: undefined },
                  { label: 'Variedad', value: productoDetalle.variedad, color: undefined },
                  // Puntuación SCA: solo en ficha técnica para buyer_b2b APPROVED con evidencia N2/N3 (INV-04/CAL-02)
                ] as Array<{label:string;value:string|null|undefined;color:string|undefined}>).filter(r => r.value).map((r, i, arr) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < arr.length - 1 ? 7 : 0, marginBottom: i < arr.length - 1 ? 7 : 0, borderBottom: i < arr.length - 1 ? '1px solid var(--tw-border)' : 'none' }}>
                    <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{r.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: r.color ?? 'var(--tw-text)' }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Ficha técnica B2B — solo buyer_b2b APPROVED (CAT-03 / B2B-02) */}
              {rolUsuario === 'buyer_b2b' && estadoAprobacionB2B === 'APPROVED' && (
                <div style={{ background: 'rgba(143,175,138,.06)', border: '1px solid rgba(143,175,138,.3)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 10 }}>🏢</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--tw-sage)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Ficha técnica B2B</span>
                    <span style={{ marginLeft: 'auto', fontSize: 9, background: 'rgba(143,175,138,.2)', color: 'var(--tw-sage)', border: '1px solid rgba(143,175,138,.4)', padding: '1px 7px', borderRadius: 4, fontWeight: 700 }}>✓ APROBADO</span>
                  </div>
                  {/* Tabla de precios mayoristas */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Precios mayoristas</div>
                    {[
                      { rango: '1–4 kg', precio: (productoDetalle.precioBaseKgCents / 100).toFixed(2) },
                      { rango: '5–9 kg', precio: ((productoDetalle.precioBaseKgCents * 0.86) / 100).toFixed(2) },
                      { rango: '≥ 10 kg', precio: ((productoDetalle.precioBaseKgCents * 0.75) / 100).toFixed(2) },
                    ].map((t, i, arr) => (
                      <div key={t.rango} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < arr.length - 1 ? 6 : 0, marginBottom: i < arr.length - 1 ? 6 : 0, borderBottom: i < arr.length - 1 ? '1px solid rgba(143,175,138,.2)' : 'none' }}>
                        <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{t.rango}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tw-sage)' }}>S/ {t.precio}/kg</span>
                      </div>
                    ))}
                  </div>
                  {/* Datos técnicos adicionales */}
                  {([
                    { label: 'Humedad', value: (productoDetalle as any).humedad ? `${(productoDetalle as any).humedad}%` : '11–12%' },
                    { label: 'Merma aprox.', value: (productoDetalle as any).merma ?? '5–8%' },
                    { label: 'Tostado', value: (productoDetalle as any).perfilTostado ?? 'Fresco a pedido' },
                    { label: 'Envío mínimo', value: `${(productoDetalle as any).kgMinPedido ?? 3} kg` },
                  ] as Array<{label:string;value:string}>).map((r, i, arr) => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < arr.length - 1 ? 5 : 0, marginBottom: i < arr.length - 1 ? 5 : 0, borderBottom: i < arr.length - 1 ? '1px solid rgba(143,175,138,.15)' : 'none' }}>
                      <span style={{ fontSize: 9, color: 'var(--tw-text-muted)' }}>{r.label}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--tw-text)' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Banner PENDING — precio mayorista bloqueado */}
              {rolUsuario === 'buyer_b2b' && estadoAprobacionB2B === 'PENDING_APPROVAL' && (
                <div style={{ background: 'rgba(232,184,75,.08)', border: '1px solid rgba(232,184,75,.3)', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>⏳</span>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#e8b84b', marginBottom: 2 }}>Precios mayoristas pendientes</div>
                    <div style={{ fontSize: 9, color: 'var(--tw-text-muted)', lineHeight: 1.5 }}>Tu cuenta está en revisión. Los precios B2B y la ficha técnica estarán disponibles al ser aprobada (≤24h hábiles).</div>
                  </div>
                </div>
              )}
            </div>
          )

          const ContenidoCentral = ({ mobilePanel }: { mobilePanel?: boolean }) => (
            <>
              <div style={{ position: 'relative', background: 'linear-gradient(145deg,#fdf8f4,#f0e6d8)', height: mobilePanel ? 200 : 420, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: mobilePanel ? 0 : 12, overflow: 'hidden', flexShrink: 0 }}>
                {productoDetalle.foto ? <img src={productoDetalle.foto} alt={productoDetalle.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} /> : <span style={{ fontSize: mobilePanel ? 60 : 120, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.12))' }}>☕</span>}
                <div style={{ position: 'absolute', top: 10, right: mobilePanel ? 10 : 42 }}><span style={{ background: proc.bg, color: proc.color, border: `1px solid ${proc.border}`, fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>{proc.label}</span></div>
                {mobilePanel && (<button onClick={() => setProductoDetalle(null)} style={{ position: 'absolute', top: 8, right: 10, background: 'rgba(0,0,0,.35)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>)}
              </div>
              <div style={{ display: 'flex', gap: 5, justifyContent: 'center', padding: '7px 0 4px' }}>
                {[0,1,2].map(i => (<div key={i} style={{ width: i === 0 ? 18 : 7, height: 7, borderRadius: i === 0 ? 4 : '50%', background: i === 0 ? 'var(--tw-terra)' : 'var(--tw-border)' }} />))}
              </div>
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: mobilePanel ? 18 : 24, fontWeight: 700, color: 'var(--tw-text)', lineHeight: 1.25, marginBottom: 7 }}>{productoDetalle.nombre}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 7 }}>
                  <span style={{ background: proc.bg, color: proc.color, border: `1px solid ${proc.border}`, fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>{proc.label}</span>
                </div>
                {productoDetalle.cosecha && (<div style={{ fontSize: 10, color: 'var(--tw-text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>🗓️ Campaña {productoDetalle.cosecha}</div>)}
                {productoDetalle.kgDisponibles != null && productoDetalle.kgDisponibles > 0 && (<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--tw-sage)', flexShrink: 0 }} /><span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>{productoDetalle.kgDisponibles} kg disponibles</span></div>)}
              </div>
              {productoDetalle.notasSabor && productoDetalle.notasSabor.length > 0 && (<div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tw-text-muted)', marginBottom: 6 }}>Notas de cata</div><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{productoDetalle.notasSabor.map((nota, i) => (<span key={i} style={{ background: 'rgba(201,110,75,.1)', border: '1px solid rgba(201,110,75,.2)', borderRadius: 10, padding: '3px 9px', fontSize: 9, color: 'var(--tw-terra)', fontWeight: 600 }}>{nota}</span>))}</div></div>)}
              {productoDetalle.descripcion && (<div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tw-text-muted)', marginBottom: 6 }}>Historia del café</div><p style={{ fontSize: 11, color: 'var(--tw-text-muted)', lineHeight: 1.65, margin: 0 }}>{productoDetalle.descripcion}</p></div>)}
            </>
          )

          return (
            <>
              <div className="detalle-desktop" style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'var(--tw-bg)', overflowY: 'auto', fontFamily: 'Montserrat, sans-serif' }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--tw-bg)', borderBottom: '1px solid var(--tw-border)', height: 48 }}>
                  <div style={{ maxWidth: 1380, margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center', gap: 14, width: '100%', boxSizing: 'border-box' }}>
                    <button onClick={() => setProductoDetalle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tw-terra)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, padding: 0, fontFamily: 'Montserrat, sans-serif' }}>← Catálogo</button>
                    <span style={{ fontSize: 10, color: 'var(--tw-text-muted)' }}>›</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tw-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>{productoDetalle.nombre}</span>
                  </div>
                </div>
                <div style={{ maxWidth: 1380, margin: '0 auto', padding: '28px 24px 60px', width: '100%', boxSizing: 'border-box' as const, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><ContenidoCentral /></div>
                  <div style={{ position: 'sticky', top: 64 }}><PanelAccion /></div>
                </div>
                {crossSelling.length > 0 && (
                  <div style={{ maxWidth: 1380, margin: '0 auto', padding: '0 24px 60px', width: '100%', boxSizing: 'border-box' as const }}>
                    <div style={{ borderTop: '1px solid var(--tw-border)', paddingTop: 28, marginBottom: 20 }}>
                      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 700, color: 'var(--tw-text)' }}>Más de {productoDetalle.caficultorNombre}</div>
                      <div style={{ fontSize: 10, color: 'var(--tw-text-muted)', marginTop: 2 }}>📍 {productoDetalle.caficultorRegion ?? 'Perú'}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                      {crossSelling.map((p: ProductoONE) => {
                        const cp = PROCESO_BADGE_LOCAL[(p.proceso || '').toLowerCase()] ?? { bg: 'var(--tw-card)', color: 'var(--tw-text-muted)', border: 'var(--tw-border)', label: p.proceso }
                        return (
                          <div key={p.id} onClick={() => { setProductoDetalle(p); setDetalleFormato('1kg'); setDetalleCantidad(1); window.scrollTo(0,0) }} style={{ background: 'var(--tw-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--tw-border)', cursor: 'pointer' }}>
                            <div style={{ height: 140, background: 'linear-gradient(145deg,#fdf8f4,#f0e6d8)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                              {p.foto ? <img src={p.foto} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} /> : <span style={{ fontSize: 44 }}>🫘</span>}
                              <span style={{ position: 'absolute', top: 7, right: 7, background: cp.bg, color: cp.color, border: `1px solid ${cp.border}`, fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>{cp.label}</span>
                            </div>
                            <div style={{ padding: '10px 12px 12px' }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', lineHeight: 1.3, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{p.nombre}</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--tw-terra)' }}>S/ {(p.precioBaseKgCents / 100).toFixed(0)}<span style={{ fontSize: 9, fontWeight: 500, color: 'var(--tw-text-muted)' }}>/kg</span></span>
                                <button type="button" onClick={e => { e.stopPropagation(); onSeleccionar?.(p, '1kg'); showToast(`Agregado: ${p.nombre}`) }} style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid var(--tw-terra)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>+ Carrito</button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="detalle-mobile" onClick={() => setProductoDetalle(null)} style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', fontFamily: 'Montserrat, sans-serif' }}>
                <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: '92vh', background: 'var(--tw-bg)', borderRadius: '16px 16px 0 0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  <ContenidoCentral mobilePanel />
                  <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <PanelAccion compact />
                    {crossSelling.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tw-text)', marginBottom: 8 }}>Más de {productoDetalle.caficultorNombre}</div>
                        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6 }}>
                          {crossSelling.map((p: ProductoONE) => {
                            const cp = PROCESO_BADGE_LOCAL[(p.proceso || '').toLowerCase()] ?? { bg: 'var(--tw-card)', color: 'var(--tw-text-muted)', border: 'var(--tw-border)', label: p.proceso }
                            return (
                              <div key={p.id} onClick={() => { setProductoDetalle(p); setDetalleFormato('1kg'); setDetalleCantidad(1) }} style={{ width: 148, flexShrink: 0, background: 'var(--tw-card)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--tw-border)', cursor: 'pointer' }}>
                                <div style={{ height: 90, background: 'linear-gradient(145deg,#fdf8f4,#f0e6d8)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                  {p.foto ? <img src={p.foto} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} /> : <span style={{ fontSize: 32 }}>🫘</span>}
                                  <span style={{ position: 'absolute', top: 5, right: 5, background: cp.bg, color: cp.color, border: `1px solid ${cp.border}`, fontSize: 7, fontWeight: 700, padding: '1px 4px', borderRadius: 3 }}>{cp.label}</span>
                                </div>
                                <div style={{ padding: '7px 8px' }}>
                                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tw-text)', lineHeight: 1.3, marginBottom: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{p.nombre}</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--tw-terra)' }}>S/ {(p.precioBaseKgCents / 100).toFixed(0)}<span style={{ fontSize: 8, fontWeight: 500, color: 'var(--tw-text-muted)' }}>/kg</span></span>
                                    <button type="button" onClick={e => { e.stopPropagation(); onSeleccionar?.(p, '1kg'); showToast(`Agregado: ${p.nombre}`) }} style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--tw-terra)', background: 'transparent', color: 'var(--tw-terra)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )
        })()}

        {/* ── MODAL PERFIL CAFICULTOR ── */}
        {caficultorModalId !== null && (
          <ModalCaficultor caficultorId={caficultorModalId} onClose={() => setCaficultorModalId(null)} />
        )}

        {/* ── BOTTOM NAV MOBILE ── */}
        {!embeddedMode && (<nav className="bn-bar" role="navigation" aria-label="Navegación principal">
          {rolUsuario === 'seller' ? (
            <>
              <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }} className="bn-item active"><span className="bn-icon">☕</span><span>Catálogo</span></a>
              <a href="/caficultor-portal" onClick={(e) => { e.preventDefault(); navigate('/caficultor-portal') }} className="bn-item"><span className="bn-icon">🌱</span><span>Mis cafés</span></a>
              <a href="/caficultor-portal" onClick={(e) => { e.preventDefault(); navigate('/caficultor-portal') }} className="bn-item"><span className="bn-icon">📦</span><span>Mis Ventas</span></a>
              <a href="/caficultor-portal" onClick={(e) => { e.preventDefault(); navigate('/caficultor-portal') }} className="bn-item"><span className="bn-icon">🤖</span><span>Wasi</span></a>
              <a href="/caficultor-portal" onClick={(e) => { e.preventDefault(); navigate('/caficultor-portal') }} className="bn-item"><span className="bn-icon">👤</span><span>Perfil</span></a>
            </>
          ) : (
            <>
              <a href="/" onClick={(e) => { e.preventDefault(); navigate('/') }} className="bn-item active"><span className="bn-icon">☕</span><span>Catálogo</span></a>
              <a href="/portal" onClick={(e) => { e.preventDefault(); navigate('/portal') }} className="bn-item" style={{ position: 'relative' }}>
                <span className="bn-icon">📦</span>
                {(carritoCount ?? 0) > 0 && (<span className="bn-badge">{carritoCount}</span>)}
                <span>Mis Compras</span>
              </a>
              <a href="/docs" onClick={(e) => { e.preventDefault(); navigate('/docs') }} className="bn-item"><span className="bn-icon">📄</span><span>Docs</span></a>
              <a href="/para-caficultores" onClick={(e) => { e.preventDefault(); navigate('/para-caficultores') }} className="bn-item"><span className="bn-icon">🌱</span><span>Caficultor</span></a>
              <button className="bn-item" onClick={() => irALogin({ registro: true })} style={{ position: 'relative' }}>
                <span className="bn-icon">👤</span><span>Perfil</span>
              </button>
            </>
          )}
        </nav>)}

      </div>
    </>
  )
}

export default CatalogoPublico
