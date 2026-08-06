'use client';
import { Fragment, useEffect, useState } from 'react';
import { supabase, fetchAll, stockPorCliente, stockTH, StockDisponible } from '../lib/supabaseClient';
import Login from './login';
import {
  OrdenDirecta,
  EventoDirecta,
  EQUIPOS,
  PERFILES,
  TIPOS_OT,
  APROB_OPCIONES,
  ANTICIPO_OPCIONES,
  TIPO_RTO_OPCIONES,
  ESTADO_ENTREGA_OPCIONES,
  OPERARIOS_IMPRESION,
  OPERARIOS_FIJACION,
  OPERARIOS_ENTREGA,
  RESPONSABLES_COMERCIAL,
  TELAS_HYPE_TH,
  TURNOS_REPORTE,
  TIPOS_PROCESO_CIBITEX,
  RolloReporte,
  Muestra,
  EventoMuestra,
  EventoRollo,
  CotizacionOt,
  faltaParaProducir,
  calcularPrioridad,
  formatFecha,
} from '../lib/types';

// Trae ingresos/egresos de la app de Stock (mismo Supabase) para el chequeo
// de tela insuficiente del Dashboard. No usa fetchAll porque esas tablas no
// tienen por qué tener una columna 'created_at' — sólo pide las columnas
// que necesita, sin ordenar, hasta 10.000 filas (de sobra para un libro de
// stock).
async function fetchStockTabla(tabla: 'ingresos' | 'egresos'): Promise<any[]> {
  const { data, error } = await supabase.from(tabla).select('id_hype, cliente, mts').range(0, 9999);
  if (error) {
    console.error(`No se pudo cargar ${tabla} para el chequeo de tela del Dashboard`, error);
    return [];
  }
  return data || [];
}

// Color especial para la palabra del equipo cuando está seleccionada:
// Monalisa 32 en lila pastel, Monalisa 8 en naranja pastel. Se usa en la
// columna Equipo de Producción, Muestras y en las pestañas de Reporte diario.
function colorEquipo(equipo: string | null | undefined): string | undefined {
  if (equipo === 'Monalisa 32') return '#b19cd9';
  if (equipo === 'Monalisa 8') return '#ffab73';
  return undefined;
}

// Fondo pastel de las tarjetas de equipo en el Dashboard: lila para
// Monalisa 32, naranja para Monalisa 8.
function fondoEquipo(equipo: string): string {
  if (equipo === 'Monalisa 32') return '#e6d9f5';
  if (equipo === 'Monalisa 8') return '#ffdcb3';
  return '#fbe0c8';
}

const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 };
const lbl: React.CSSProperties = { fontSize: 11, color: '#888', display: 'block', marginBottom: 4 };
const btn: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 13, cursor: 'pointer' };
const th: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #eee', fontSize: 11, color: '#888', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #f0f0f0', fontSize: 13, whiteSpace: 'nowrap' };
const card: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #eee' };
const selSm: React.CSSProperties = { padding: '4px 6px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 };

export default function Home() {
  const [pagina, setPagina] = useState('dashboard');
  const [ordenes, setOrdenes] = useState<OrdenDirecta[]>([]);
  const [eventos, setEventos] = useState<EventoDirecta[]>([]);
  const [eventosMuestras, setEventosMuestras] = useState<EventoMuestra[]>([]);
  const [eventosReporte, setEventosReporte] = useState<EventoRollo[]>([]);
  const [muestras, setMuestras] = useState<Muestra[]>([]);
  const [rollosReporte, setRollosReporte] = useState<RolloReporte[]>([]);
  const [ingresosStock, setIngresosStock] = useState<any[]>([]);
  const [egresosStock, setEgresosStock] = useState<any[]>([]);
  const [cotizacionesOt, setCotizacionesOt] = useState<CotizacionOt[]>([]);
  const [loading, setLoading] = useState(true);
  const [logueado, setLogueado] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [rol, setRol] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: userData } = await supabase.from('usuarios').select('*').eq('email', session.user.email).single();
        if (userData) {
          setRol(userData.rol);
          setNombreUsuario(userData.nombre);
        }
        setLogueado(true);
        cargarTodo(true);
      }
      setCheckingAuth(false);
    });
  }, []);

  // mostrarLoading solo se usa en la carga inicial (pantalla en blanco,
  // no hay nada que mostrar todavía). En los refrescos posteriores —
  // después de editar una celda, guardar un pedido, etc. — no se muestra
  // la pantalla de "Cargando...", porque eso desmontaba toda la tabla y
  // hacía que el scroll volviera arriba de todo cada vez que se tocaba algo.
  async function cargarTodo(mostrarLoading = false) {
    if (mostrarLoading) setLoading(true);
    const [ords, evts, evtsMuestras, evtsReporte, muestrasData, rollos, ingresos, egresos, cotizaciones] = await Promise.all([
      fetchAll('ordenes_directa', 'created_at'),
      fetchAll('ordenes_directa_eventos', 'created_at'),
      fetchAll('muestras_eventos', 'created_at'),
      fetchAll('reporte_rollos_eventos', 'created_at'),
      fetchAll('muestras', 'created_at'),
      fetchAll('reporte_rollos', 'created_at'),
      fetchStockTabla('ingresos'),
      fetchStockTabla('egresos'),
      fetchAll('cotizaciones_ot', 'created_at'),
    ]);
    setOrdenes(ords);
    setEventos(evts);
    setEventosMuestras(evtsMuestras);
    setEventosReporte(evtsReporte);
    setMuestras(muestrasData);
    setRollosReporte(rollos);
    setIngresosStock(ingresos);
    setEgresosStock(egresos);
    setCotizacionesOt(cotizaciones);
    if (mostrarLoading) setLoading(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    setLogueado(false);
    setRol('');
    setNombreUsuario('');
  }

  function handleLogin(rolUsuario: string, nombre: string) {
    setRol(rolUsuario);
    setNombreUsuario(nombre);
    setLogueado(true);
    cargarTodo(true);
  }

  if (checkingAuth)
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', color: '#fff' }}>
        Cargando...
      </div>
    );
  if (!logueado) return <Login onLogin={handleLogin} />;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦', roles: ['admin', 'diseno', 'administrativo', 'operario', 'encargado', 'logistica', 'comercial'] },
    { id: 'diseno', label: 'Ingreso y Modif Pedidos', icon: '✎', roles: ['admin', 'diseno'] },
    { id: 'administracion', label: 'Administración', icon: '$', roles: ['admin', 'administrativo', 'comercial'] },
    { id: 'reporte', label: 'Reporte diario', icon: '▤', roles: ['admin', 'diseno', 'administrativo', 'operario', 'encargado', 'logistica', 'comercial'] },
    { id: 'general', label: 'Producción', icon: '☷', roles: ['admin', 'diseno', 'administrativo', 'operario', 'encargado', 'logistica', 'comercial'] },
    { id: 'muestras', label: 'Muestras', icon: '◈', roles: ['admin', 'diseno', 'administrativo', 'operario', 'encargado', 'logistica', 'comercial'] },
    { id: 'historial', label: 'Historial', icon: '☰', roles: ['admin', 'diseno', 'administrativo', 'operario', 'encargado', 'logistica', 'comercial'] },
  ].filter((n) => n.roles.includes(rol.trim()) || rol.trim() === 'admin');

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20, background: '#1a1a2e', display: 'flex', alignItems: 'center', padding: '0 20px', height: 60, overflowX: 'auto' }}>
        <div style={{ marginRight: 24, whiteSpace: 'nowrap' }}>
          <img src="/logo.png" alt="HYPE printlab" style={{ height: 46, display: 'block' }} />
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginTop: 2 }}>PRODUCCIÓN · DIRECTA</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-evenly', flex: 1, height: 60 }}>
          {navItems.map((n) => (
            <div
              key={n.id}
              onClick={() => setPagina(n.id)}
              style={{
                padding: '6px 8px',
                cursor: 'pointer',
                color: pagina === n.id ? '#fff' : 'rgba(255,255,255,0.55)',
                background: pagina === n.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderBottom: pagina === n.id ? '2px solid #e85d2f' : '2px solid transparent',
                fontSize: 11,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                textTransform: 'uppercase',
                textAlign: 'center',
                minWidth: 78,
              }}
            >
              <span style={{ whiteSpace: 'normal', lineHeight: 1.15, maxWidth: 82 }}>{n.label}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, whiteSpace: 'nowrap', marginLeft: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>{nombreUsuario}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>{rol}</div>
          </div>
          <button onClick={cerrarSesion} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: 11, cursor: 'pointer', textTransform: 'uppercase' }}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div style={{ marginTop: 60, padding: 24, background: pagina === 'dashboard' ? '#2b2b40' : '#f5f5f7', minHeight: 'calc(100vh - 60px)' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Cargando...</div>}
        {!loading && (
          <>
            {pagina === 'dashboard' && <Dashboard ordenes={ordenes} muestras={muestras} rollosReporte={rollosReporte} ingresosStock={ingresosStock} egresosStock={egresosStock} />}
            {pagina === 'general' && <VistaGeneral ordenes={ordenes} onCambio={cargarTodo} rol={rol} />}
            {pagina === 'muestras' && <VistaMuestras rol={rol} nombreUsuario={nombreUsuario} />}
            {pagina === 'reporte' && <PanelReporteDiario ordenes={ordenes} rol={rol} />}
            {pagina === 'diseno' && <PanelDiseno ordenes={ordenes} nombreUsuario={nombreUsuario} onCambio={cargarTodo} />}
            {pagina === 'administracion' && <PanelAdministracion ordenes={ordenes} cotizacionesOt={cotizacionesOt} nombreUsuario={nombreUsuario} onCambio={cargarTodo} />}
            {pagina === 'historial' && <Historial eventos={eventos} eventosMuestras={eventosMuestras} eventosReporte={eventosReporte} ordenes={ordenes} />}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
// Explica por qué un ítem (diseño) todavía no está terminado. Se usa en
// el Dashboard para que se vea, de un vistazo, qué falta en cada OT abierta.
function motivoIncompleto(o: OrdenDirecta): string {
  if (o.fecha_fin) return '';
  const falta = faltaParaProducir(o);
  if (falta.length > 0) return `Falta: ${falta.join(', ')}`;
  if (o.imp_operario === 'NO') return `No se pudo imprimir: ${o.motivo_no_impreso || 'sin motivo especificado'}`;
  if (!o.imp_operario) return 'Esperando impresión';
  if (!o.fija_operario) return 'Impreso, esperando fijación';
  return 'En proceso';
}

// Stock disponible de cada tela, calculado a partir de ingresos/egresos de
// la app de Stock (mismo Supabase). Dos mapas: uno por cliente+tela (la
// mayoría de las telas son de un cliente puntual) y otro global por código
// para las telas "Stock TH" (propias de HYPE, compartidas entre clientes).
interface MapasStock { porClienteTela: Map<string, number>; porIdTH: Map<string, number> }

function construirMapasStock(ingresos: any[], egresos: any[]): MapasStock {
  const porClienteTela = new Map<string, number>();
  const porIdTH = new Map<string, number>();
  const sumar = (lista: any[], signo: 1 | -1) => {
    (lista || []).forEach((r) => {
      const idHype = String(r.id_hype || '').trim();
      if (!idHype) return;
      const mts = Number(r.mts || 0) * signo;
      if (idHype.toUpperCase().startsWith('TH')) {
        porIdTH.set(idHype, (porIdTH.get(idHype) || 0) + mts);
      }
      const cliente = String(r.cliente || '').trim().toLowerCase();
      if (cliente) {
        const key = `${cliente}__${idHype}`;
        porClienteTela.set(key, (porClienteTela.get(key) || 0) + mts);
      }
    });
  };
  sumar(ingresos, 1);
  sumar(egresos, -1);
  return { porClienteTela, porIdTH };
}

// Motivo por el que una OT figura en "OT incompletas": o bien se marcó NO
// en Op Imp (no se pudo imprimir), o bien todavía le falta imprimir mts y
// no hay stock suficiente de su tela para cubrir lo que falta. Devuelve
// null si la orden no está bloqueada por ninguno de los dos motivos.
function motivoBloqueo(o: OrdenDirecta, stock: MapasStock): string | null {
  if (o.imp_operario === 'NO') {
    return `No se pudo imprimir: ${o.motivo_no_impreso || 'sin motivo especificado'}`;
  }
  const faltanImprimir = Number(o.mts_pedidos || 0) - Number(o.mts_impresos || 0);
  if (faltanImprimir > 0 && o.cod_tela) {
    const idHype = String(o.cod_tela).trim();
    const disponible = idHype.toUpperCase().startsWith('TH')
      ? stock.porIdTH.get(idHype) ?? 0
      : stock.porClienteTela.get(`${(o.cliente || '').trim().toLowerCase()}__${idHype}`) ?? 0;
    if (disponible < faltanImprimir) {
      const faltante = faltanImprimir - disponible;
      return `Faltan ${faltante.toLocaleString()} mts de ${o.tela || idHype} para poder realizar la orden`;
    }
  }
  return null;
}

// Plazo máximo de entrega: si pasaron más de estos días desde la fecha
// del pedido y todavía no se entregó, la OT está atrasada.
const PLAZO_ENTREGA_DIAS = 25;

function diasDesde(fecha: string): number {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
}

// Agrupa por nro_ot y devuelve las OT que superaron el plazo de entrega
// (25 días desde la fecha del pedido más antigua de esa OT) y todavía
// tienen algún ítem sin entregar.
function ordenesAtrasadasPorPlazo(ordenes: OrdenDirecta[]): { nro_ot: string; cliente: string; fecha: string; dias: number }[] {
  const porOt = new Map<string, OrdenDirecta[]>();
  ordenes.forEach((o) => {
    const arr = porOt.get(o.nro_ot) || [];
    arr.push(o);
    porOt.set(o.nro_ot, arr);
  });
  return Array.from(porOt.values())
    .filter((filas) => filas.some((f) => f.estado_entrega === 'En almacén'))
    .map((filas) => {
      const fecha = filas.reduce((min, f) => (f.fecha < min ? f.fecha : min), filas[0].fecha);
      return { nro_ot: filas[0].nro_ot, cliente: filas[0].cliente, fecha, dias: diasDesde(fecha) };
    })
    .filter((ot) => ot.dias > PLAZO_ENTREGA_DIAS)
    .sort((a, b) => b.dias - a.dias);
}

// Mts impresos y mts pendientes (pedidos que todavía no se imprimieron
// nada) de un equipo puntual (Monalisa 32 / Monalisa 8).
function totalesPorEquipo(ordenes: OrdenDirecta[], equipo: string) {
  const filas = ordenes.filter((o) => o.equipo === equipo);
  const impresos = filas.reduce((s, o) => s + Number(o.mts_impresos || 0), 0);
  const pendientes = filas.filter((o) => Number(o.mts_impresos || 0) === 0).reduce((s, o) => s + Number(o.mts_pedidos || 0), 0);
  return { impresos, pendientes };
}

// Lunes de la semana a la que pertenece una fecha (para agrupar "por semana").
function inicioSemana(fechaStr: string): string {
  const d = new Date(fechaStr.split('T')[0] + 'T00:00:00');
  const dia = d.getDay(); // 0 = domingo
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function formatSemana(inicio: string): string {
  const d = new Date(inicio + 'T00:00:00');
  d.setDate(d.getDate() + 6);
  return `${formatFecha(inicio)} al ${formatFecha(d.toISOString().split('T')[0])}`;
}

// Los dos grupos que pidió Vicky para Terminación (Cibitex): por un lado
// preparación/planchado, por otro lado fijado — cada tipo de proceso cae
// en uno de los dos.
const GRUPO_PREP_PLANCHADO = ['PREP Y PRETRATADO', 'PLANCHADO', 'PREP Y REENCANUTADO'];
const GRUPO_FIJADO = ['FIJADO', 'FIJ Y POSTRATADO'];

interface AgregadoImpresionMensual { operario: string; monalisa32: number; monalisa8: number }
interface AgregadoTerminacionMensual { operario: string; fijado: number; prepPlanchado: number }

// Mts totales impresos ESTE MES por operario, separados por equipo
// (Monalisa 32/8). Se calcula a partir del Reporte diario (reporte_rollos),
// no de ordenes_directa — ahí es donde se carga el detalle real por rollo y turno.
function mtsImpresionMensualPorOperario(rollosReporte: RolloReporte[]): AgregadoImpresionMensual[] {
  const mesActual = new Date().toISOString().slice(0, 7);
  const mapa = new Map<string, AgregadoImpresionMensual>();
  rollosReporte
    .filter((r) => (r.equipo === 'Monalisa 32' || r.equipo === 'Monalisa 8') && r.op_imp && r.fecha && r.fecha.slice(0, 7) === mesActual)
    .forEach((r) => {
      const operario = r.op_imp as string;
      const actual = mapa.get(operario) || { operario, monalisa32: 0, monalisa8: 0 };
      const mts = Number(r.mts_imp_rollo || 0);
      if (r.equipo === 'Monalisa 32') actual.monalisa32 += mts;
      if (r.equipo === 'Monalisa 8') actual.monalisa8 += mts;
      mapa.set(operario, actual);
    });
  return Array.from(mapa.values()).sort((a, b) => a.operario.localeCompare(b.operario));
}

// Mts totales de Terminación (Cibitex) ESTE MES por operario, agrupados en
// dos totales según el tipo de proceso: Fijado (FIJADO / FIJ Y POSTRATADO)
// por un lado, Preparación/Planchado (PREP Y REENCANUTADO / PREP Y
// PRETRATADO / PLANCHADO) por otro.
function mtsTerminacionMensualPorOperario(rollosReporte: RolloReporte[]): AgregadoTerminacionMensual[] {
  const mesActual = new Date().toISOString().slice(0, 7);
  const mapa = new Map<string, AgregadoTerminacionMensual>();
  rollosReporte
    .filter((r) => r.equipo === 'Cibitex' && r.op_fij && r.fecha && r.fecha.slice(0, 7) === mesActual)
    .forEach((r) => {
      const operario = r.op_fij as string;
      const actual = mapa.get(operario) || { operario, fijado: 0, prepPlanchado: 0 };
      const mts = Number(r.mts_fij || 0);
      if (GRUPO_FIJADO.includes(r.tipo_proceso || '')) actual.fijado += mts;
      if (GRUPO_PREP_PLANCHADO.includes(r.tipo_proceso || '')) actual.prepPlanchado += mts;
      mapa.set(operario, actual);
    });
  return Array.from(mapa.values()).sort((a, b) => a.operario.localeCompare(b.operario));
}

function Dashboard({
  ordenes,
  muestras,
  rollosReporte,
  ingresosStock,
  egresosStock,
}: {
  ordenes: OrdenDirecta[];
  muestras: Muestra[];
  rollosReporte: RolloReporte[];
  ingresosStock: any[];
  egresosStock: any[];
}) {
  const stockMapas = construirMapasStock(ingresosStock, egresosStock);
  const incompletos = ordenes.filter((o) => motivoBloqueo(o, stockMapas) !== null);
  const otsIncompletas = new Set(incompletos.map((o) => o.nro_ot)).size;
  const ordenesAtrasadas = ordenesAtrasadasPorPlazo(ordenes);
  const muestrasNoHechas = muestras.filter((m) => m.imp_operario === 'NO');
  const anioActual = new Date().toISOString().slice(0, 4);
  const mesActual = new Date().toISOString().slice(0, 7);
  const ordenesAnio = ordenes.filter((o) => o.fecha && o.fecha.slice(0, 4) === anioActual);
  const ordenesMes = ordenes.filter((o) => o.fecha && o.fecha.slice(0, 7) === mesActual);
  const mtsImpAnio = ordenesAnio.reduce((s, o) => s + Number(o.mts_impresos || 0), 0);
  const mtsPedAnio = ordenesAnio.reduce((s, o) => s + Number(o.mts_pedidos || 0), 0);
  const mtsImpMes = ordenesMes.reduce((s, o) => s + Number(o.mts_impresos || 0), 0);
  const mtsPedMes = ordenesMes.reduce((s, o) => s + Number(o.mts_pedidos || 0), 0);
  const impresionPorOperario = mtsImpresionMensualPorOperario(rollosReporte);
  const terminacionPorOperario = mtsTerminacionMensualPorOperario(rollosReporte);

  return (
    <div style={{ textTransform: 'uppercase' }}>
      <div style={{ ...card, marginBottom: 20, background: '#1a1a2e', color: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 1, marginBottom: 8 }}>
              Mts impresos / pedidos — en el año
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, color: '#fff' }}>
              {mtsImpAnio.toLocaleString()} / {mtsPedAnio.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 1, marginBottom: 8 }}>
              Mts impresos / pedidos — en el mes
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, color: '#fff' }}>
              {mtsImpMes.toLocaleString()} / {mtsPedMes.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
        {EQUIPOS.map((eq) => {
          const { impresos, pendientes } = totalesPorEquipo(ordenes, eq);
          return (
            <div key={eq} style={{ ...card, background: fondoEquipo(eq), color: '#000' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#000', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                Mts — {eq}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#000' }}>Mts impresos</span>
                <span style={{ fontWeight: 700, color: '#000' }}>{impresos.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#000' }}>Mts pendientes por imprimir</span>
                <span style={{ fontWeight: 700, color: '#000' }}>{pendientes.toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 10, color: '#000', marginTop: 10 }}>
                "Pendientes por imprimir" es la suma de Mts Ped de los pedidos de este equipo que todavía no tienen nada impreso.
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ ...card, marginBottom: 20, border: '1px solid #000', background: '#fdfbf5', color: '#000' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#ff6b6b', letterSpacing: 1, marginBottom: 12 }}>
          Muestras en stand by ({muestrasNoHechas.length}) — marcadas NO en Muestras
        </div>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Fecha', 'Cliente', 'Diseño', 'Motivo'].map((h) => <th key={h} style={{ ...th, color: '#000' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {muestrasNoHechas.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#000' }}>Ninguna muestra quedó sin imprimir 🎉</td></tr>}
              {muestrasNoHechas.map((m) => (
                <tr key={m.id}>
                  <td style={{ ...td, color: '#000' }}>{formatFecha(m.fecha)}</td>
                  <td style={{ ...td, color: '#000' }}>{m.cliente || '—'}</td>
                  <td style={{ ...td, color: '#000' }}>{m.diseno || '—'}</td>
                  <td style={{ ...td, color: '#000', textTransform: 'none' }}>{m.motivo_no_impreso || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 20, border: '1px solid #000', background: '#fdfbf5', color: '#000' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#ff6b6b', letterSpacing: 1, marginBottom: 12 }}>
          Órdenes atrasadas ({ordenesAtrasadas.length}) — superaron el plazo de entrega de {PLAZO_ENTREGA_DIAS} días
        </div>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['OT', 'Cliente', 'Fecha pedido', 'Días transcurridos'].map((h) => <th key={h} style={{ ...th, color: '#000' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {ordenesAtrasadas.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#000' }}>Ninguna orden superó el plazo 🎉</td></tr>}
              {ordenesAtrasadas.map((ot) => (
                <tr key={ot.nro_ot}>
                  <td style={{ ...td, fontFamily: 'monospace', color: '#000' }}>{ot.nro_ot}</td>
                  <td style={{ ...td, color: '#000' }}>{ot.cliente}</td>
                  <td style={{ ...td, color: '#000' }}>{formatFecha(ot.fecha)}</td>
                  <td style={{ ...td, color: '#000', fontWeight: 700 }}>{ot.dias}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: '#ff6b6b', letterSpacing: 1, marginBottom: 12 }}>
          Órdenes incompletas ({incompletos.length} ítems en {otsIncompletas} OT) — marcadas NO en Op Imp o sin tela suficiente
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['OT', 'Cliente', 'Diseño', 'Motivo'].map((h) => <th key={h} style={{ ...th, color: '#000' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {incompletos.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#000' }}>No hay órdenes incompletas 🎉</td></tr>}
              {incompletos
                .slice()
                .sort((a, b) => a.nro_ot.localeCompare(b.nro_ot))
                .map((o) => (
                  <tr key={o.id}>
                    <td style={{ ...td, fontFamily: 'monospace', color: '#000' }}>{o.nro_ot}</td>
                    <td style={{ ...td, color: '#000' }}>{o.cliente}</td>
                    <td style={{ ...td, color: '#000' }}>{o.diseno}</td>
                    <td style={{ ...td, color: '#ff6b6b', fontWeight: 700, textTransform: 'uppercase' }}>{motivoBloqueo(o, stockMapas)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ ...card, background: '#e6dcf7', color: '#000' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#000', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            Impresión — mts del mes por operario
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Operario', 'Monalisa 32', 'Monalisa 8'].map((h) => (
                    <th key={h} style={{ ...th, color: '#000' }}>
                      {h}
                      {h !== 'Operario' && <span style={{ textTransform: 'lowercase' }}> (mts.)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {impresionPorOperario.length === 0 && <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: '#000' }}>Todavía no hay datos</td></tr>}
                {impresionPorOperario.map((r) => (
                  <tr key={r.operario}>
                    <td style={{ ...td, color: '#000' }}>{r.operario}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#000' }}>{r.monalisa32.toLocaleString()}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#000' }}>{r.monalisa8.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...card, background: '#e6dcf7', color: '#000' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#000', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            Terminación — mts del mes por operario
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Operario', 'Fijado', 'Preparación'].map((h) => (
                    <th key={h} style={{ ...th, color: '#000' }}>
                      {h}
                      {h !== 'Operario' && <span style={{ textTransform: 'lowercase' }}> (mts.)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {terminacionPorOperario.length === 0 && <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: '#000' }}>Todavía no hay datos</td></tr>}
                {terminacionPorOperario.map((r) => (
                  <tr key={r.operario}>
                    <td style={{ ...td, color: '#000' }}>{r.operario}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#000' }}>{r.fijado.toLocaleString()}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#000' }}>{r.prepPlanchado.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel Diseño: alta de pedidos + edición de aprob/post
// ---------------------------------------------------------------------------
function PanelDiseno({ ordenes, nombreUsuario, onCambio }: { ordenes: OrdenDirecta[]; nombreUsuario: string; onCambio: () => void }) {
  // Esta pantalla es solo para cargar un pedido nuevo: la cola completa de
  // pedidos ya se ve en la solapa Producción, no hace falta duplicarla acá.
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, textTransform: 'uppercase' }}>Ingreso y Modificación de Pedidos</div>
        <div style={{ fontSize: 13, color: '#888' }}>Cargá el pedido, revisalo completo y confirmalo para sumarlo a Producción</div>
      </div>

      <SolicitudesPendientes nombreUsuario={nombreUsuario} onCambio={onCambio} />

      <FormAltaDiseno ordenes={ordenes} nombreUsuario={nombreUsuario} onGuardado={onCambio} />

      <BuscarPedido ordenes={ordenes} onCambio={onCambio} />
    </div>
  );
}

// Solicitudes que llegaron desde el formulario público (/pedido), sin
// login — todavía no son pedidos reales. Se muestran acá para que HYPE las
// revise. Al tocar "Marcar cargado" se generan automáticamente las filas
// en ordenes_directa (una por diseño), con un Nro OT nuevo asignado por
// orden de ingreso — el mismo circuito que ya usa "Nuevo pedido" más abajo.
// OJO: esto solo tiene sentido para pedidos DIRECTA (ALG/LINO), porque
// todavía no existe un módulo de Producción para Sublimación — si llega
// una solicitud de Sublimación, igual se carga en esta misma tabla
// (ordenes_directa) porque no hay otro lugar donde ponerla.
interface SolicitudPedido {
  id: number;
  tipo_trabajo: string | null;
  empresa: string;
  cuit: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  cp: string | null;
  provincia: string | null;
  estado: string;
  created_at: string;
}
interface LineaSolicitud {
  id: number;
  solicitud_id: number;
  tela_origen: string | null;
  tela_detalle: string | null;
  color_tela: string | null;
  diseno: string | null;
  cantidad_mts: number | null;
  observaciones: string | null;
}

function SolicitudesPendientes({ nombreUsuario, onCambio }: { nombreUsuario: string; onCambio: () => void }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudPedido[]>([]);
  const [lineasPorSolicitud, setLineasPorSolicitud] = useState<Record<number, LineaSolicitud[]>>({});
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);

  async function cargar() {
    const { data: sols, error } = await supabase
      .from('solicitudes_pedido')
      .select('*')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true });
    if (error) {
      // Lo más probable si esto falla es que todavía no se corrió el SQL
      // que crea las tablas — no rompemos la pantalla por eso.
      console.error('No se pudieron cargar las solicitudes de pedido (¿se creó la tabla solicitudes_pedido?):', error);
      setCargando(false);
      return;
    }
    setSolicitudes(sols || []);
    if (sols && sols.length > 0) {
      const { data: lineas } = await supabase
        .from('solicitudes_pedido_lineas')
        .select('*')
        .in('solicitud_id', sols.map((s: any) => s.id));
      const agrupadas: Record<number, LineaSolicitud[]> = {};
      (lineas || []).forEach((l: any) => {
        agrupadas[l.solicitud_id] = agrupadas[l.solicitud_id] || [];
        agrupadas[l.solicitud_id].push(l);
      });
      setLineasPorSolicitud(agrupadas);
    }
    setCargando(false);
  }
  useEffect(() => {
    cargar();
  }, []);

  // Carga automáticamente el pedido en Producción (una fila en
  // ordenes_directa por diseño, todas con un Nro OT nuevo) y recién
  // después manda el mail de confirmación y marca la solicitud como
  // cargada. Si algo falla al crear las filas en Producción, no se marca
  // nada como cargado — la solicitud queda pendiente para reintentar.
  async function marcarCargado(s: SolicitudPedido) {
    const lineasSolicitud = lineasPorSolicitud[s.id] || [];
    if (lineasSolicitud.length === 0) {
      alert('Esta solicitud no tiene diseños cargados, no se puede pasar a Producción.');
      return;
    }
    if (!confirm(`Se va a crear un Nro OT nuevo en Producción con los ${lineasSolicitud.length} diseño(s) de "${s.empresa}". ¿Confirmás?`)) return;

    setProcesando(s.id);

    const { data: nroOt, error: errorOt } = await supabase.rpc('nuevo_nro_ot_directa');
    if (errorOt || !nroOt) {
      setProcesando(null);
      alert('No se pudo generar el Nro OT: ' + (errorOt?.message || 'error desconocido'));
      return;
    }

    const { data: maxRow } = await supabase
      .from('ordenes_directa')
      .select('orden_manual')
      .order('orden_manual', { ascending: false })
      .limit(1)
      .maybeSingle();
    const ordenManualParaGuardar = (maxRow?.orden_manual || 0) + 1;

    // Buscamos en el stock REAL (no en ningún catálogo fijo) qué id_hype
    // corresponde a cada tela del pedido, para completar la columna ID
    // solo cuando esa tela puntual ya está físicamente ingresada. Tela
    // HYPE (TH) se busca en el pool general de Stock TH (no es de un
    // cliente en particular); Tela Cliente (TC) se busca en el stock
    // cargado a nombre de este cliente puntual. Si no hay coincidencia,
    // el ID queda vacío hasta que la tela se ingrese — igual criterio que
    // el alta manual (buscarCodTela).
    const necesitaStockTH = lineasSolicitud.some((l) => l.tela_origen === 'HYPE');
    const [stockTHReal, stockClienteReal] = await Promise.all([
      necesitaStockTH ? stockTH() : Promise.resolve([] as StockDisponible[]),
      stockPorCliente(s.empresa),
    ]);
    const buscarIdHypeReal = (telaTexto: string, disponibles: StockDisponible[]): string | null => {
      const tela = (telaTexto || '').trim().toLowerCase();
      if (!tela) return null;
      const coincidencias = disponibles.filter((d) => d.tela.trim().toLowerCase() === tela);
      if (coincidencias.length === 0) return null;
      return coincidencias.sort((a, b) => b.disponible - a.disponible)[0].id_hype;
    };

    const filasParaInsertar = lineasSolicitud.map((l) => {
      const stockDeEstaLinea = l.tela_origen === 'HYPE' ? stockTHReal : stockClienteReal;
      return {
        nro_ot: nroOt as string,
        fecha: new Date().toISOString().split('T')[0],
        equipo: null,
        perfil: null,
        tipo_ot: null,
        cliente: s.empresa,
        diseno: l.diseno || '',
        mts_pedidos: Number(l.cantidad_mts) || 0,
        tela: l.tela_detalle || null,
        cod_tela: buscarIdHypeReal(l.tela_detalle, stockDeEstaLinea),
        color: l.color_tela || null,
        post: false,
        orden_manual: ordenManualParaGuardar,
        creado_por: nombreUsuario ? `${nombreUsuario} (form web)` : 'Form web',
      };
    });

    const { data: filasInsertadas, error: errorInsert } = await supabase
      .from('ordenes_directa')
      .insert(filasParaInsertar)
      .select();
    if (errorInsert) {
      setProcesando(null);
      alert('No se pudo cargar el pedido en Producción: ' + errorInsert.message);
      return;
    }

    // Mismo criterio que en el alta manual: la tela HYPE (Stock TH) se
    // reserva ya con los Mts Pedidos, apenas entra el pedido.
    const egresosTH = (filasInsertadas || [])
      .filter((fila: any) => (fila.cod_tela || '').toUpperCase().startsWith('TH') && Number(fila.mts_pedidos) > 0)
      .map((fila: any) => ({
        fecha: new Date().toISOString().split('T')[0],
        cliente: fila.cliente,
        tela: fila.tela,
        id_hype: fila.cod_tela,
        mts: Number(fila.mts_pedidos),
        estado: 'A producción',
        observaciones: `OT ${fila.nro_ot} · Directa · reservado al ingresar el pedido (Stock TH, vía form web)`,
        orden_id: fila.id,
      }));
    if (egresosTH.length > 0) {
      const { error: errorEgresoTH } = await supabase.from('egresos').insert(egresosTH);
      if (errorEgresoTH) {
        console.error('No se pudo reservar el stock TH automáticamente:', errorEgresoTH);
      }
    }

    const { error: errorEstado } = await supabase
      .from('solicitudes_pedido')
      .update({ estado: 'cargado', nro_ot_asignado: nroOt })
      .eq('id', s.id);
    if (errorEstado) {
      console.error('El pedido ya se cargó en Producción, pero no se pudo actualizar el estado de la solicitud:', errorEstado);
    }

    // Si el cliente ya existe en la base de Clientes del Stock (nombre
    // idéntico), le completamos ahí el contacto/tel/mail que dejó en el
    // form — pero solo los campos que en Stock todavía están vacíos, para
    // no pisar datos que ya estén cargados y curados a mano. Si no existe
    // ningún cliente con ese nombre, no creamos uno nuevo (eso requiere
    // asignar un código de cliente, y eso lo sigue haciendo el staff a
    // mano en Stock). Guardamos una nota de qué pasó para mostrarla en el
    // cartel final — así, si no se pudo actualizar, se ve por qué en vez
    // de fallar en silencio.
    let notaCliente = '';
    try {
      const { data: clienteExistente, error: errorBuscarCliente } = await supabase
        .from('clientes')
        .select('id, cuit, contacto, tel, mail')
        .ilike('nombre', s.empresa.trim())
        .maybeSingle();
      if (errorBuscarCliente) {
        console.error('No se pudo buscar el cliente en Stock:', errorBuscarCliente);
        notaCliente = `\n\n(No se pudo revisar el cliente "${s.empresa}" en Stock: ${errorBuscarCliente.message})`;
      } else if (!clienteExistente) {
        notaCliente = `\n\n(No encontré en Stock un cliente con el nombre "${s.empresa}" exacto — si ya existe, revisá que el nombre coincida igual, letra por letra.)`;
      } else {
        const cambiosCliente: Record<string, string> = {};
        if (!clienteExistente.cuit && s.cuit) cambiosCliente.cuit = s.cuit;
        if (!clienteExistente.contacto && s.contacto) cambiosCliente.contacto = s.contacto;
        if (!clienteExistente.tel && s.telefono) cambiosCliente.tel = s.telefono;
        if (!clienteExistente.mail && s.email) cambiosCliente.mail = s.email;
        if (Object.keys(cambiosCliente).length > 0) {
          const { error: errorActualizarCliente } = await supabase.from('clientes').update(cambiosCliente).eq('id', clienteExistente.id);
          if (errorActualizarCliente) {
            console.error('No se pudo actualizar el contacto del cliente en Stock:', errorActualizarCliente);
            notaCliente = `\n\n(Encontré a "${s.empresa}" en Stock pero no pude actualizar su contacto: ${errorActualizarCliente.message})`;
          } else {
            notaCliente = `\n\nTambién completé el contacto de "${s.empresa}" en Stock.`;
          }
        }
      }
    } catch (err: any) {
      console.error('No se pudo completar el contacto del cliente en Stock:', err);
      notaCliente = `\n\n(No se pudo completar el contacto de "${s.empresa}" en Stock.)`;
    }

    // Le mandamos al cliente el mail con el pedido consolidado (tela + diseño + mts).
    // Es "mejor esfuerzo": si falla, no bloqueamos el flujo de todos modos.
    if (s.email) {
      try {
        await fetch('/api/consolidar-pedido', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: s.email,
            empresa: s.empresa,
            lineas: lineasSolicitud.map((l) => ({
              telaOrigen: l.tela_origen,
              telaDetalle: l.tela_detalle,
              colorTela: l.color_tela,
              diseno: l.diseno,
              cantidadMts: l.cantidad_mts,
            })),
          }),
        });
      } catch (err) {
        console.error('No se pudo mandar el mail del pedido consolidado:', err);
      }
    }

    setProcesando(null);
    alert(`Listo — se cargó en Producción con la OT ${nroOt}.${notaCliente}`);
    cargar();
    onCambio();
  }

  // Se llama desde "Error pedido": pide el motivo, lo manda por mail al
  // cliente (asunto "PEDIDO RECHAZADO") y saca la solicitud de la lista de
  // pendientes.
  async function rechazarPedido(s: SolicitudPedido) {
    const razon = window.prompt('¿Por qué el pedido no está bien? (esto se le manda al cliente por mail)', '');
    if (razon === null) return; // canceló, no hace nada
    if (!razon.trim()) { alert('Escribí el motivo del rechazo.'); return; }
    const { error } = await supabase.from('solicitudes_pedido').update({ estado: 'rechazado' }).eq('id', s.id);
    if (error) { alert('Error: ' + error.message); return; }
    if (s.email) {
      try {
        await fetch('/api/rechazar-pedido', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: s.email, razon: razon.trim() }),
        });
      } catch (err) {
        console.error('No se pudo mandar el mail de rechazo del pedido:', err);
      }
    }
    cargar();
  }

  if (cargando || solicitudes.length === 0) return null;

  return (
    <div style={{ ...card, marginBottom: 20, border: '1px solid #e85d2f', background: '#fff8f2' }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', color: '#e85d2f' }}>
        Solicitudes de pedido recibidas ({solicitudes.length})
      </div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
        Llegaron desde el formulario web del cliente. Revisalas y, si está todo bien, tocá "Marcar cargado" — se crea automáticamente el Nro OT y las filas en Producción.
      </div>
      {solicitudes.map((s) => (
        <div key={s.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{s.empresa}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{new Date(s.created_at).toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => marcarCargado(s)} disabled={procesando === s.id} style={{ ...btn, fontSize: 12, padding: '4px 10px' }}>
                {procesando === s.id ? 'Cargando...' : '✓ Marcar cargado'}
              </button>
              <button onClick={() => rechazarPedido(s)} disabled={procesando === s.id} style={{ ...btn, fontSize: 12, padding: '4px 10px', color: '#c00', borderColor: '#c00' }}>✕ Error pedido</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 13, marginBottom: 12 }}>
            {s.tipo_trabajo && <div><b>Tipo:</b> {s.tipo_trabajo}</div>}
            {s.cuit && <div><b>CUIT:</b> {s.cuit}</div>}
            {s.contacto && <div><b>Contacto:</b> {s.contacto}</div>}
            {s.telefono && <div><b>Tel:</b> {s.telefono}</div>}
            {s.email && <div><b>Mail:</b> {s.email}</div>}
            {s.direccion && <div><b>Dirección:</b> {s.direccion}</div>}
            {(s.cp || s.provincia) && <div><b>CP/Prov:</b> {s.cp || '—'} / {s.provincia || '—'}</div>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>{['Tela', 'Tela específica', 'Color', 'Diseño', 'Mts', 'Observaciones'].map((h) => <th key={h} style={{ ...th, padding: '4px 8px' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {(lineasPorSolicitud[s.id] || []).map((l) => (
                <tr key={l.id}>
                  <td style={{ ...td, padding: '4px 8px' }}>{l.tela_origen || '—'}</td>
                  <td style={{ ...td, padding: '4px 8px' }}>{l.tela_detalle || '—'}</td>
                  <td style={{ ...td, padding: '4px 8px' }}>{l.color_tela || '—'}</td>
                  <td style={{ ...td, padding: '4px 8px' }}>{l.diseno || '—'}</td>
                  <td style={{ ...td, padding: '4px 8px' }}>{l.cantidad_mts ?? '—'}</td>
                  <td style={{ ...td, padding: '4px 8px' }}>{l.observaciones || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// Buscador de pedidos ya cargados, para poder corregirlos o anularlos sin
// tener que ir a la solapa Producción. No muestra nada hasta que se escribe
// algo — así no duplicamos la cola completa acá.
function BuscarPedido({ ordenes, onCambio }: { ordenes: OrdenDirecta[]; onCambio: () => void }) {
  const [busqueda, setBusqueda] = useState('');

  const termino = busqueda.trim().toLowerCase();
  const resultados = termino
    ? ordenes.filter((o) =>
        [o.nro_ot, o.cliente, o.diseno, o.tela || ''].some((campo) => (campo || '').toLowerCase().includes(termino))
      )
    : [];

  async function actualizar(id: number, campo: string, valor: any) {
    const { error } = await supabase.from('ordenes_directa').update({ [campo]: valor }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else onCambio();
  }

  // Igual que en Producción: al corregir la tela acá, busca en Stock el
  // id_hype que corresponde a ese cliente + tela y lo completa solo.
  async function buscarCodTela(o: OrdenDirecta, telaTexto?: string) {
    const tela = (telaTexto ?? o.tela) || '';
    if (!o.cliente || !tela) return;
    const disponibles = await stockPorCliente(o.cliente);
    const coincidencias = disponibles.filter((s) => s.tela.trim().toLowerCase() === tela.trim().toLowerCase());
    if (coincidencias.length === 0) return;
    const mejor = coincidencias.sort((a, b) => b.disponible - a.disponible)[0];
    await actualizar(o.id, 'cod_tela', mejor.id_hype);
  }

  // Anula (borra) un pedido, y libera el stock reservado que se le haya
  // generado (por ejemplo, la reserva de tela HYPE cargada al ingresarlo).
  async function anular(o: OrdenDirecta) {
    if (Number(o.mts_impresos || 0) > 0) return; // ya se imprimió algo: no se puede anular ni modificar acá
    if (!confirm(`¿Anular el pedido ${o.nro_ot} — ${o.cliente} — ${o.diseno}?\n\nEsto también libera el stock reservado para este pedido (si lo hay). No se puede deshacer.`)) return;
    const { error: errorEgresos } = await supabase.from('egresos').delete().eq('orden_id', o.id);
    if (errorEgresos) console.error('No se pudo liberar el stock reservado de este pedido:', errorEgresos);
    const { error } = await supabase.from('ordenes_directa').delete().eq('id', o.id);
    if (error) { alert('Error al anular: ' + error.message); return; }
    onCambio();
  }

  return (
    <div style={{ ...card, marginTop: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Buscar y modificar un pedido</div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>Buscá por Nro OT, Cliente, Diseño o Tela para corregirlo o anularlo.</div>
      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por Nro OT, Cliente, Diseño o Tela..."
        style={{ ...inp, maxWidth: 360, marginBottom: termino ? 16 : 0 }}
      />

      {termino && (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Nro OT', 'Fecha', 'Cliente', 'Diseño', 'Tela', 'Mts Ped', 'Anular'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {resultados.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#888' }}>Sin resultados</td></tr>}
                {resultados.map((o) => {
                  const bloqueada = Number(o.mts_impresos || 0) > 0;
                  const estiloBloqueado: React.CSSProperties = bloqueada
                    ? { ...selSm, width: '100%', background: '#f5e5e5', color: '#c00', cursor: 'not-allowed' }
                    : {};
                  return (
                    <tr key={o.id} style={bloqueada ? { background: '#fff5f5' } : undefined}>
                      <td style={{ ...td, fontFamily: 'monospace', color: bloqueada ? '#c00' : '#e85d2f' }}>{o.nro_ot}</td>
                      <td style={{ ...td, minWidth: 120 }}>
                        <input type="date" defaultValue={o.fecha} onBlur={(e) => actualizar(o.id, 'fecha', e.target.value)} disabled={bloqueada} style={{ ...selSm, width: '100%', minWidth: 110, ...estiloBloqueado }} />
                      </td>
                      <td style={{ ...td, minWidth: 140 }}>
                        <input defaultValue={o.cliente} onBlur={(e) => actualizar(o.id, 'cliente', e.target.value)} disabled={bloqueada} style={{ ...selSm, width: '100%', minWidth: 130, ...estiloBloqueado }} />
                      </td>
                      <td style={{ ...td, minWidth: 140 }}>
                        <input defaultValue={o.diseno} onBlur={(e) => actualizar(o.id, 'diseno', e.target.value)} disabled={bloqueada} style={{ ...selSm, width: '100%', minWidth: 130, ...estiloBloqueado }} />
                      </td>
                      <td style={{ ...td, minWidth: 150 }}>
                        <input
                          defaultValue={o.tela || ''}
                          onBlur={(e) => { actualizar(o.id, 'tela', e.target.value || null); buscarCodTela(o, e.target.value); }}
                          disabled={bloqueada}
                          style={{ ...selSm, width: '100%', minWidth: 140, ...estiloBloqueado }}
                        />
                      </td>
                      <td style={td}>
                        <input type="number" defaultValue={o.mts_pedidos} onBlur={(e) => actualizar(o.id, 'mts_pedidos', parseFloat(e.target.value) || 0)} disabled={bloqueada} style={{ ...selSm, width: 70, ...estiloBloqueado }} />
                      </td>
                      <td style={td}>
                        {bloqueada ? (
                          <span title="Ya tiene mts impresos cargados en Producción: no se puede anular ni modificar acá." style={{ fontSize: 11, color: '#c00', fontWeight: 700 }}>
                            🔒 En producción
                          </span>
                        ) : (
                          <button onClick={() => anular(o)} style={{ ...btn, padding: '4px 8px', fontSize: 11, color: '#c00', borderColor: '#c00' }}>✕ Anular</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface LineaDiseno {
  equipo: string;
  diseno: string;
  mtsPedidos: string;
  perfil: string;
  tela: string;
  codTela: string;
  disponibleTela: number | null;
  telaManual: boolean;
  post: boolean;
}

function lineaVacia(telaManualPorDefecto = false): LineaDiseno {
  return { equipo: '', diseno: '', mtsPedidos: '', perfil: '', tela: '', codTela: '', disponibleTela: null, telaManual: telaManualPorDefecto, post: false };
}

function FormAltaDiseno({ ordenes, nombreUsuario, onGuardado }: { ordenes: OrdenDirecta[]; nombreUsuario: string; onGuardado: () => void }) {
  const [modo, setModo] = useState<'nuevo' | 'existente'>('nuevo');
  const [nroOtExistente, setNroOtExistente] = useState('');
  const [nroOtGenerado, setNroOtGenerado] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipoOt, setTipoOt] = useState('');
  const [cliente, setCliente] = useState('');
  const [guardando, setGuardando] = useState(false);
  // Antes de guardar de verdad, se muestra un resumen de todo el pedido
  // para que se confirme con un "OK" — no se manda nada a Producción hasta
  // que se confirma acá.
  const [revisando, setRevisando] = useState(false);

  // Un pedido puede traer varios diseños, cada uno con su propia tela y
  // metraje — cada línea de esta lista se guarda como un renglón propio
  // en ordenes_directa, todos con el mismo nro_ot.
  const [lineas, setLineas] = useState<LineaDiseno[]>([lineaVacia()]);

  // Autocompletar cliente + telas disponibles desde la base de Stock
  const [clientesStock, setClientesStock] = useState<string[]>([]);
  const [showClientes, setShowClientes] = useState(false);
  const [stockCliente, setStockCliente] = useState<StockDisponible[]>([]);
  const [buscandoStock, setBuscandoStock] = useState(false);

  // Telas "Stock TH": códigos de tela propios de HYPE (no de un cliente
  // puntual), siempre disponibles para elegir sea cual sea el cliente.
  const [catalogoTH, setCatalogoTH] = useState<StockDisponible[]>([]);
  useEffect(() => {
    stockTH().then(setCatalogoTH);
  }, []);

  const nrosAbiertos = Array.from(new Set(ordenes.map((o) => o.nro_ot))).sort().reverse();

  useEffect(() => {
    fetchAll('clientes', 'nombre', true).then((data) => setClientesStock(data.map((c: any) => c.nombre)));
  }, []);

  async function generarNuevoOt() {
    const { data, error } = await supabase.rpc('nuevo_nro_ot_directa');
    if (error) {
      alert('Error generando OT: ' + error.message);
      return;
    }
    setNroOtGenerado(data as string);
  }

  useEffect(() => {
    if (modo === 'nuevo') generarNuevoOt();
  }, [modo]);

  useEffect(() => {
    if (modo === 'existente' && nroOtExistente) {
      const ref = ordenes.find((o) => o.nro_ot === nroOtExistente);
      if (ref) {
        setCliente(ref.cliente);
        setFecha(ref.fecha);
        setTipoOt(ref.tipo_ot || '');
        buscarStockDeCliente(ref.cliente);
      }
    }
  }, [nroOtExistente, modo]);

  async function buscarStockDeCliente(nombreCliente: string) {
    if (!nombreCliente) return;
    setBuscandoStock(true);
    const disponible = await stockPorCliente(nombreCliente);
    setStockCliente(disponible);
    setBuscandoStock(false);
    setLineas((prev) => prev.map((l) => ({ ...l, telaManual: disponible.length === 0 })));
  }

  function seleccionarCliente(nombreCliente: string) {
    setCliente(nombreCliente);
    setShowClientes(false);
    setLineas((prev) => prev.map((l) => ({ ...l, tela: '', codTela: '', disponibleTela: null })));
    buscarStockDeCliente(nombreCliente);
  }

  function actualizarLinea(idx: number, cambios: Partial<LineaDiseno>) {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...cambios } : l)));
  }

  function agregarLinea() {
    setLineas((prev) => [...prev, lineaVacia(stockCliente.length === 0)]);
  }

  function quitarLinea(idx: number) {
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  // Para pedidos con muchos diseños (hay algunos con 40+), duplicar una línea
  // ya cargada (misma tela/postratado) es más rápido que armar cada una desde cero.
  function duplicarLinea(idx: number) {
    setLineas((prev) => {
      const copia = { ...prev[idx], diseno: '', mtsPedidos: '' };
      const nuevas = [...prev];
      nuevas.splice(idx + 1, 0, copia);
      return nuevas;
    });
  }

  function seleccionarTelaLinea(idx: number, idHype: string) {
    const item = stockCliente.find((s) => s.id_hype === idHype) || catalogoTH.find((s) => s.id_hype === idHype);
    if (!item) return;
    actualizarLinea(idx, { tela: item.tela, codTela: item.id_hype, disponibleTela: item.disponible });
  }

  // Al escribir "HYPE" en el campo de tela manual, sugiere el catálogo fijo
  // de telas Stock TH para cargar rápido sin tener que tipear todo el nombre.
  const [lineaConSugerenciasTH, setLineaConSugerenciasTH] = useState<number | null>(null);

  function seleccionarTelaTHLinea(idx: number, item: { id_hype: string; descripcion: string }) {
    const disponible = catalogoTH.find((s) => s.id_hype === item.id_hype)?.disponible ?? null;
    actualizarLinea(idx, { tela: item.descripcion, codTela: item.id_hype, disponibleTela: disponible });
    setLineaConSugerenciasTH(null);
  }

  // Chequeo liviano antes de mostrar la revisión — no guarda nada todavía,
  // solo confirma que hay lo mínimo para poder ver un resumen con sentido.
  function validar(): boolean {
    const nroOt = modo === 'nuevo' ? nroOtGenerado : nroOtExistente;
    if (!nroOt || !cliente) {
      alert('Completá OT y cliente.');
      return false;
    }
    const lineasValidas = lineas.filter((l) => l.diseno && parseFloat(l.mtsPedidos));
    if (lineasValidas.length === 0) {
      alert('Cargá al menos un diseño con sus metros pedidos.');
      return false;
    }
    return true;
  }

  // Esto solo se llama desde la pantalla de revisión, después de que ya se
  // vio el resumen completo y se tocó "Confirmar" — acá recién se guarda de
  // verdad en Producción.
  async function guardar() {
    const nroOt = modo === 'nuevo' ? nroOtGenerado : nroOtExistente;
    const lineasValidas = lineas.filter((l) => l.diseno && parseFloat(l.mtsPedidos));
    if (!nroOt || !cliente || lineasValidas.length === 0) {
      setRevisando(false);
      return;
    }
    setGuardando(true);

    // orden_manual define la posición de la OT en el N de Producción (se
    // puede mover después con las flechas ↑↓). Si es un diseño nuevo para
    // una OT que ya existe, hereda la posición que ya tenía esa OT; si es
    // una OT totalmente nueva, va al final de la lista.
    const ordenManualExistente = ordenes.find((o) => o.nro_ot === nroOt)?.orden_manual;
    const maxOrdenManual = ordenes.reduce((max, o) => Math.max(max, o.orden_manual || 0), 0);
    const ordenManualParaGuardar = ordenManualExistente ?? maxOrdenManual + 1;

    const { data: filasInsertadas, error } = await supabase
      .from('ordenes_directa')
      .insert(
        lineasValidas.map((l) => ({
          nro_ot: nroOt,
          fecha,
          equipo: l.equipo || null,
          perfil: l.perfil || null,
          tipo_ot: tipoOt || null,
          cliente,
          diseno: l.diseno,
          mts_pedidos: parseFloat(l.mtsPedidos),
          tela: l.tela || null,
          cod_tela: l.codTela || null,
          post: l.post,
          orden_manual: ordenManualParaGuardar,
          creado_por: nombreUsuario,
        }))
      )
      .select();
    if (error) {
      setGuardando(false);
      alert('Error al guardar: ' + error.message);
      return;
    }

    // Para telas HYPE (Stock TH, código que arranca con "TH") el stock se
    // reserva ya con los Mts Pedidos, apenas entra el pedido — así se ve el
    // stock comprometido y lo que falta conseguir desde el primer momento
    // (a diferencia de la tela de cliente, que se descuenta recién al
    // imprimir con los Mts Impresos reales).
    const egresosTH = (filasInsertadas || [])
      .filter((fila: any) => (fila.cod_tela || '').toUpperCase().startsWith('TH') && Number(fila.mts_pedidos) > 0)
      .map((fila: any) => ({
        fecha: new Date().toISOString().split('T')[0],
        cliente: fila.cliente,
        tela: fila.tela,
        id_hype: fila.cod_tela,
        mts: Number(fila.mts_pedidos),
        estado: 'A producción',
        observaciones: `OT ${fila.nro_ot} · Directa · reservado al ingresar el pedido (Stock TH)`,
        orden_id: fila.id,
      }));
    if (egresosTH.length > 0) {
      const { error: errorEgresoTH } = await supabase.from('egresos').insert(egresosTH);
      if (errorEgresoTH) {
        console.error('No se pudo reservar el stock TH automáticamente:', errorEgresoTH);
        alert('El pedido se guardó, pero no se pudo reservar el stock TH automáticamente (revisar conexión con Stock).');
      }
    }

    setGuardando(false);
    setRevisando(false);

    // Como ahora el formulario queda siempre visible (ya no se cierra
    // solo), lo reseteamos acá para que quede listo para cargar el próximo
    // pedido en blanco.
    setLineas([lineaVacia()]);
    setCliente('');
    setStockCliente([]);
    setFecha(new Date().toISOString().split('T')[0]);
    setTipoOt('');
    setNroOtExistente('');
    if (modo === 'nuevo') generarNuevoOt();

    onGuardado();
  }

  const lineasParaRevisar = lineas.filter((l) => l.diseno && parseFloat(l.mtsPedidos));

  return (
    <div style={{ ...card, marginBottom: 20 }}>
      {revisando && (
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Revisá el pedido antes de confirmarlo</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Todavía no se guardó nada — recién se suma a Producción cuando confirmes.</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
            <div><div style={lbl}>Nro. OT</div><div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#e85d2f' }}>{modo === 'nuevo' ? nroOtGenerado : nroOtExistente}</div></div>
            <div><div style={lbl}>Cliente</div><div style={{ fontWeight: 600 }}>{cliente}</div></div>
            <div><div style={lbl}>Fecha</div><div>{formatFecha(fecha)}</div></div>
            <div><div style={lbl}>Tipo OT</div><div>{tipoOt || '—'}</div></div>
          </div>

          <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Equipo', 'Diseño', 'Mts pedidos', 'Perfil', 'Tela', 'Postratado'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {lineasParaRevisar.map((l, idx) => {
                    const excede = l.disponibleTela !== null && parseFloat(l.mtsPedidos || '0') > l.disponibleTela;
                    return (
                      <tr key={idx}>
                        <td style={{ ...td, textTransform: 'uppercase' }}>{l.equipo || '—'}</td>
                        <td style={td}>{l.diseno}</td>
                        <td style={{ ...td, color: excede ? '#c00' : undefined, fontWeight: excede ? 700 : undefined }}>
                          {l.mtsPedidos}{excede ? ` ⚠ supera stock disponible (${l.disponibleTela?.toLocaleString()} mts)` : ''}
                        </td>
                        <td style={td}>{l.perfil || '—'}</td>
                        <td style={td}>{l.tela || '—'}</td>
                        <td style={td}>{l.post ? 'Sí' : 'No'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setRevisando(false)} disabled={guardando} style={btn}>← Volver a editar</button>
            <button onClick={guardar} disabled={guardando} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>
              {guardando ? 'Guardando...' : 'Confirmar y agregar a Producción'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: revisando ? 'none' : 'block' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setModo('nuevo')} style={{ ...btn, background: modo === 'nuevo' ? '#e85d2f' : '#fff', color: modo === 'nuevo' ? '#fff' : '#333' }}>Nuevo pedido</button>
        <button onClick={() => setModo('existente')} style={{ ...btn, background: modo === 'existente' ? '#e85d2f' : '#fff', color: modo === 'existente' ? '#fff' : '#333' }}>Agregar diseño a un pedido existente</button>
      </div>

      {modo === 'nuevo' ? (
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Nro. OT (automático)</label>
          <div style={{ background: '#1a1a2e', color: '#e85d2f', fontFamily: 'monospace', fontSize: 16, fontWeight: 700, padding: '8px 14px', borderRadius: 8, display: 'inline-block' }}>
            {nroOtGenerado || '...'}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14, maxWidth: 300 }}>
          <label style={lbl}>Pedido existente</label>
          <select value={nroOtExistente} onChange={(e) => setNroOtExistente(e.target.value)} style={inp}>
            <option value="">Seleccionar OT...</option>
            {nrosAbiertos.map((n) => {
              const ref = ordenes.find((o) => o.nro_ot === n);
              return <option key={n} value={n}>{n} · {ref?.cliente}</option>;
            })}
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        <div><label style={lbl}>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inp} disabled={modo === 'existente'} /></div>
        <div><label style={lbl}>Tipo OT</label>
          <select value={tipoOt} onChange={(e) => setTipoOt(e.target.value)} style={inp} disabled={modo === 'existente'}>
            <option value="">Seleccionar</option>{TIPOS_OT.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ position: 'relative' }}>
          <label style={lbl}>Cliente</label>
          <input
            value={cliente}
            onChange={(e) => { setCliente(e.target.value); setShowClientes(true); }}
            onFocus={() => setShowClientes(true)}
            onBlur={() => cliente && buscarStockDeCliente(cliente)}
            placeholder="Buscar cliente..."
            style={inp}
            disabled={modo === 'existente'}
          />
          {showClientes && cliente && modo === 'nuevo' && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 8, maxHeight: 200, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
              {clientesStock.filter((c) => c.toLowerCase().includes(cliente.toLowerCase())).slice(0, 8).map((c) => (
                <div key={c} onClick={() => seleccionarCliente(c)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>{c}</div>
              ))}
              {clientesStock.filter((c) => c.toLowerCase().includes(cliente.toLowerCase())).length === 0 && (
                <div style={{ padding: '8px 12px', fontSize: 12, color: '#888' }}>Sin coincidencias en Stock — se usará como texto libre</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        Diseños del pedido ({lineas.length})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {lineas.map((l, idx) => {
          const excedeStock = l.disponibleTela !== null && parseFloat(l.mtsPedidos || '0') > l.disponibleTela;
          return (
            <div key={idx} style={{ border: '1px solid #eee', borderRadius: 10, padding: 14, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 12 }}>
                <button
                  onClick={() => duplicarLinea(idx)}
                  title="Duplicar este diseño (misma tela y postratado)"
                  style={{ border: 'none', background: 'none', color: '#e85d2f', cursor: 'pointer', fontSize: 13 }}
                >
                  ⧉ Duplicar
                </button>
                {lineas.length > 1 && (
                  <button
                    onClick={() => quitarLinea(idx)}
                    title="Quitar este diseño"
                    style={{ border: 'none', background: 'none', color: '#c00', cursor: 'pointer', fontSize: 13 }}
                  >
                    ✕ Quitar
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>Diseño {idx + 1}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
                <div><label style={lbl}>Equipo</label>
                  <select value={l.equipo} onChange={(e) => actualizarLinea(idx, { equipo: e.target.value })} style={{ ...inp, textTransform: 'uppercase' }}>
                    <option value="">Seleccionar</option>{EQUIPOS.map((e) => <option key={e} value={e} style={{ textTransform: 'uppercase' }}>{e}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Diseño</label><input value={l.diseno} onChange={(e) => actualizarLinea(idx, { diseno: e.target.value })} style={inp} /></div>
                <div>
                  <label style={lbl}>Mts pedidos</label>
                  <input
                    type="number"
                    value={l.mtsPedidos}
                    onChange={(e) => actualizarLinea(idx, { mtsPedidos: e.target.value })}
                    style={{ ...inp, borderColor: excedeStock ? '#c00' : '#ddd', color: excedeStock ? '#c00' : undefined }}
                  />
                </div>
                <div><label style={lbl}>Perfil</label>
                  <select value={l.perfil} onChange={(e) => actualizarLinea(idx, { perfil: e.target.value })} style={inp}>
                    <option value="">Seleccionar</option>{PERFILES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: '1/-1' }}>
                  <label style={lbl}>Tela {buscandoStock && '(buscando en stock del cliente...)'}</label>

                  {stockCliente.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Stock de este cliente:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {stockCliente.map((s) => (
                          <div
                            key={s.id_hype}
                            onClick={() => seleccionarTelaLinea(idx, s.id_hype)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              border: l.codTela === s.id_hype ? '2px solid #e85d2f' : '1px solid #ddd',
                              cursor: 'pointer',
                              fontSize: 12,
                              background: l.codTela === s.id_hype ? '#fff5f0' : '#fff',
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>{s.tela} {s.color ? `· ${s.color}` : ''}</div>
                            <div style={{ fontFamily: 'monospace', color: '#888', fontSize: 10 }}>{s.id_hype}</div>
                            <div style={{ fontWeight: 700, color: s.disponible > 0 ? '#3B6D11' : '#c00' }}>{s.disponible.toLocaleString()} mts</div>
                            {s.remitos.length > 0 && <div style={{ fontSize: 10, color: '#666' }}>Remito: {s.remitos.join(', ')}</div>}
                            {s.observaciones.length > 0 && <div style={{ fontSize: 10, color: '#666', maxWidth: 160, whiteSpace: 'normal' }}>{s.observaciones.join(' · ')}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                    {stockCliente.length > 0 ? 'O escribí otra tela (ej: HYPE para ver el stock TH):' : 'Escribí la tela (ej: HYPE para ver el stock TH):'}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      value={l.tela}
                      onChange={(e) => { actualizarLinea(idx, { tela: e.target.value, codTela: '', disponibleTela: null }); setLineaConSugerenciasTH(idx); }}
                      onFocus={() => setLineaConSugerenciasTH(idx)}
                      onBlur={() => setTimeout(() => setLineaConSugerenciasTH((v) => (v === idx ? null : v)), 150)}
                      placeholder="Nombre de la tela"
                      style={inp}
                    />
                    {lineaConSugerenciasTH === idx && l.tela.trim().toLowerCase().includes('hype') && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 8, maxHeight: 220, overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                        {TELAS_HYPE_TH.filter((t) => t.descripcion.toLowerCase().includes(l.tela.trim().toLowerCase())).map((t) => (
                          <div key={t.id_hype} onClick={() => seleccionarTelaTHLinea(idx, t)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f5f5f5' }}>
                            <div style={{ fontWeight: 600 }}>{t.descripcion}</div>
                            <div style={{ fontFamily: 'monospace', color: '#888', fontSize: 10 }}>{t.id_hype}</div>
                          </div>
                        ))}
                        {TELAS_HYPE_TH.filter((t) => t.descripcion.toLowerCase().includes(l.tela.trim().toLowerCase())).length === 0 && (
                          <div style={{ padding: '8px 12px', fontSize: 12, color: '#888' }}>Sin coincidencias en Stock TH</div>
                        )}
                      </div>
                    )}
                  </div>
                  {l.disponibleTela !== null && (
                    <div style={{ marginTop: 6, fontSize: 12, color: excedeStock ? '#c00' : '#3B6D11', fontWeight: 600 }}>
                      {excedeStock
                        ? `⚠ El pedido supera el stock disponible (${l.disponibleTela.toLocaleString()} mts)`
                        : `Stock disponible: ${l.disponibleTela.toLocaleString()} mts`}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18 }}>
                  <input type="checkbox" checked={l.post} onChange={(e) => actualizarLinea(idx, { post: e.target.checked })} id={`post-${idx}`} />
                  <label htmlFor={`post-${idx}`} style={{ fontSize: 13 }}>Requiere postratado</label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={agregarLinea} style={{ ...btn, background: '#fff', color: '#e85d2f', border: '1px dashed #e85d2f' }}>+ Agregar otro diseño a este pedido</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={() => { if (validar()) setRevisando(true); }} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>
          Revisar {lineas.length > 1 ? `${lineas.length} diseños` : 'diseño'}
        </button>
      </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel Administración: anticipo, entregar, tipo rto
// ---------------------------------------------------------------------------
// Layout fijo (label + control) para las filas de Subtotal/Descuento/
// Impuesto o cargo/Envío/Total: dos columnas de ancho fijo, así el texto
// de la etiqueta arranca siempre en la misma posición sin importar cuánto
// mida el control de al lado (input, select, etc.) — quedan alineadas.
const filaResumenFila: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '90px 190px',
  gap: 8,
  alignItems: 'center',
  justifyContent: 'flex-end',
  marginLeft: 'auto',
};
const filaResumenLabel: React.CSSProperties = {
  textAlign: 'left',
  fontWeight: 700,
  textTransform: 'uppercase',
  fontSize: 12,
};

// % de recargo según la forma de pago elegida. Sin cargo no suma nada;
// Cuenta Recaudadora +3,5%; IVA +21%.
function porcentajeRecargo(formaPago: string | null): number {
  if (formaPago === 'CUENTA RECAUDADORA') return 3.5;
  if (formaPago === 'IVA') return 21;
  return 0;
}

// Formatea un número con "000000" (6 dígitos, sin signo $), completando
// con ceros a la izquierda. Se usa para Cant. Mts en el form de Anticipo
// suelto, tal como se pidió.
function formatearSeisDigitosSinSigno(valor: string): number | null {
  const soloDigitos = (valor || '').replace(/\D/g, '');
  if (!soloDigitos) return null;
  return Number(soloDigitos.slice(0, 6));
}

// Igual que formatearPrecioMtSeisDigitos (definida dentro de
// PanelAdministracion): guarda "$" + 6 dígitos con ceros a la izquierda.
// Va a nivel de módulo porque PanelCotizacionesOt también la necesita.
function formatearPrecioMtSeisDigitosGlobal(valor: string): string | null {
  const soloDigitos = (valor || '').replace(/\D/g, '');
  if (!soloDigitos) return null;
  return '$' + soloDigitos.slice(0, 6).padStart(6, '0');
}

// Nro OT tal como se ve realmente hoy en Producción: 12 dígitos con ceros a
// la izquierda (ej. "000000000004"). Se usa en Cotizaciones OT, donde el
// Nro OT se tipea a mano en vez de generarse con el RPC de Producción.
function formatearNroOtDocePadding(valor: string): string | null {
  const soloDigitos = (valor || '').replace(/\D/g, '');
  if (!soloDigitos) return null;
  return soloDigitos.slice(0, 12).padStart(12, '0');
}

// ---------------------------------------------------------------------------
// Cotizaciones OT: Comercial presupuesta a mano una OT (tipeando el Nro OT,
// no necesariamente ya cargada en Producción). Va abajo de "Anticipos sin
// OT", mismo formato tabla.
// ---------------------------------------------------------------------------
function PanelCotizacionesOt({
  cotizacionesOt,
  nombreUsuario,
  onCambio,
}: {
  cotizacionesOt: CotizacionOt[];
  nombreUsuario: string;
  onCambio: () => void;
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const vacio = {
    fecha: new Date().toISOString().split('T')[0],
    nro_ot: '',
    cliente: '',
    cant_mts: '',
    cod_tela: '',
    tela: '',
    precio_mt: '',
  };
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);

  // Autocompletar Cliente desde la tabla `clientes` (misma base que la app
  // de Stock).
  const [clientesStockCotizacion, setClientesStockCotizacion] = useState<string[]>([]);
  useEffect(() => {
    fetchAll('clientes', 'nombre', true).then((data) => setClientesStockCotizacion(data.map((c: any) => c.nombre)));
  }, []);

  // Catálogo real de telas TH (siempre con "HYPE" adelante en la
  // descripción, tal como está cargado en el stock).
  const [catalogoTHCotizacion, setCatalogoTHCotizacion] = useState<StockDisponible[]>([]);
  useEffect(() => {
    stockTH().then(setCatalogoTHCotizacion);
  }, []);

  async function guardar() {
    if (!form.cliente.trim()) { alert('Completá el cliente.'); return; }
    setGuardando(true);
    const { error } = await supabase.from('cotizaciones_ot').insert([{
      fecha: form.fecha,
      nro_ot: formatearNroOtDocePadding(form.nro_ot),
      cliente: form.cliente.trim(),
      cant_mts: formatearSeisDigitosSinSigno(form.cant_mts),
      tela: form.tela || null,
      cod_tela: form.cod_tela || null,
      precio_mt: formatearPrecioMtSeisDigitosGlobal(form.precio_mt),
      creado_por: nombreUsuario || null,
    }]);
    setGuardando(false);
    if (error) { alert('Error al guardar: ' + error.message); return; }
    setForm(vacio);
    setMostrarForm(false);
    onCambio();
  }

  async function eliminarCotizacion(c: CotizacionOt) {
    if (!confirm(`¿Eliminar la cotización de "${c.cliente}" del ${formatFecha(c.fecha)}?`)) return;
    const { error } = await supabase.from('cotizaciones_ot').delete().eq('id', c.id);
    if (error) alert('Error: ' + error.message);
    else onCambio();
  }

  function calcularImporteCotizacion(c: CotizacionOt): number {
    const mts = Number(c.cant_mts) || 0;
    const precio = Number((c.precio_mt || '').replace(/\D/g, '')) || 0;
    return Math.round(mts * precio);
  }

  const previewImporte = (Number(form.cant_mts) || 0) * (Number(form.precio_mt) || 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', color: '#c77d16' }}>
          Cotizaciones OT ({cotizacionesOt.length})
        </div>
        <button onClick={() => setMostrarForm((v) => !v)} style={{ ...btn, background: '#c77d16', color: '#fff', border: '1px solid #c77d16' }}>
          {mostrarForm ? 'Cancelar' : '+ Nueva cotización'}
        </button>
      </div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
        Para presupuestar una OT a mano (Nro OT tipeado, aunque todavía no esté cargada en Producción).
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden', border: '1px solid #f1dcb8', marginBottom: 32 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="adm-grid" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Fecha', 'OT', 'Cliente', 'Cant Mts', 'Tela', '$ x Mt', 'Importe', ''].map((h) => (
                  <th key={h} style={{ ...th, background: '#c77d16', color: '#fff', textTransform: 'uppercase', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mostrarForm && (
                <tr style={{ background: '#fff8ec' }}>
                  <td style={td}>
                    <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} style={{ ...selSm, width: '100%', minWidth: 120 }} />
                  </td>
                  <td style={td}>
                    <input
                      value={form.nro_ot}
                      onChange={(e) => setForm({ ...form, nro_ot: e.target.value.replace(/\D/g, '') })}
                      style={{ ...selSm, width: 110, fontFamily: 'monospace' }}
                      placeholder="000000000004"
                      inputMode="numeric"
                    />
                  </td>
                  <td style={{ ...td, minWidth: 150 }}>
                    <input
                      value={form.cliente}
                      onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                      style={{ ...selSm, width: '100%', minWidth: 140 }}
                      placeholder="Cliente"
                      list="clientes-cotizacion-ot"
                    />
                    <datalist id="clientes-cotizacion-ot">
                      {clientesStockCotizacion.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </td>
                  <td style={td}>
                    <input value={form.cant_mts} onChange={(e) => setForm({ ...form, cant_mts: e.target.value.replace(/\D/g, '') })} style={{ ...selSm, width: 65 }} placeholder="000000" inputMode="numeric" />
                  </td>
                  <td style={{ ...td, minWidth: 170 }}>
                    <select
                      value={form.cod_tela ? form.cod_tela : (form.tela === 'TCL-' ? 'TCL-' : '')}
                      onChange={(e) => {
                        if (e.target.value === 'TCL-') {
                          setForm({ ...form, tela: 'TCL-', cod_tela: '' });
                          return;
                        }
                        const seleccionada = catalogoTHCotizacion.find((t) => t.id_hype === e.target.value);
                        setForm({ ...form, cod_tela: e.target.value, tela: seleccionada ? seleccionada.tela : '' });
                      }}
                      style={{ ...selSm, width: '100%' }}
                    >
                      <option value="">Seleccionar tela</option>
                      <option value="TCL-">TCL- (tela cliente)</option>
                      {catalogoTHCotizacion.map((t) => (
                        <option key={t.id_hype} value={t.id_hype}>{t.tela}</option>
                      ))}
                    </select>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontWeight: 700 }}>$</span>
                      <input value={form.precio_mt} onChange={(e) => setForm({ ...form, precio_mt: e.target.value.replace(/\D/g, '') })} style={{ ...selSm, width: 65 }} placeholder="000000" inputMode="numeric" />
                    </div>
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>{previewImporte ? '$' + Math.round(previewImporte).toLocaleString('es-AR') : '—'}</td>
                  <td style={td}>
                    <button onClick={guardar} disabled={guardando} style={{ ...btn, padding: '4px 8px', fontSize: 11, background: '#c77d16', color: '#fff', border: '1px solid #c77d16' }}>
                      {guardando ? '…' : 'Guardar'}
                    </button>
                  </td>
                </tr>
              )}
              {cotizacionesOt.length === 0 && !mostrarForm && (
                <tr>
                  <td style={{ ...td, color: '#bbb' }} colSpan={8}>Todavía no hay cotizaciones cargadas.</td>
                </tr>
              )}
              {cotizacionesOt.map((c) => (
                <tr key={c.id} style={{ background: '#fff9f0' }}>
                  <td style={td}>{formatFecha(c.fecha)}</td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{c.nro_ot || '—'}</td>
                  <td style={td}>{c.cliente}</td>
                  <td style={td}>{c.cant_mts ?? '—'}</td>
                  <td style={td}>{c.tela || '—'}</td>
                  <td style={td}>{c.precio_mt ? '$' + Number(c.precio_mt.replace(/\D/g, '')).toLocaleString('es-AR') : '—'}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>${calcularImporteCotizacion(c).toLocaleString('es-AR')}</td>
                  <td style={td}>
                    <button onClick={() => eliminarCotizacion(c)} style={{ ...btn, padding: '4px 8px', fontSize: 11, color: '#c00', borderColor: '#c00' }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PanelAdministracion({
  ordenes,
  cotizacionesOt,
  nombreUsuario,
  onCambio,
}: {
  ordenes: OrdenDirecta[];
  cotizacionesOt: CotizacionOt[];
  nombreUsuario: string;
  onCambio: () => void;
}) {
  async function actualizar(id: number, campo: string, valor: any) {
    const { error } = await supabase.from('ordenes_directa').update({ [campo]: valor }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else onCambio();
  }

  // El descuento es por OT, no por línea — se guarda repetido en todas
  // las filas de esa OT juntas, para que quede consistente sin importar
  // desde qué línea se lo cargue.
  async function actualizarDescuentoOt(nroOt: string, pct: number | null) {
    const { error } = await supabase.from('ordenes_directa').update({ descuento_pct: pct }).eq('nro_ot', nroOt);
    if (error) alert('Error: ' + error.message);
    else onCambio();
  }

  // Misma lógica que el descuento: la forma de pago es por OT completa.
  async function actualizarFormaPagoOt(nroOt: string, valor: string) {
    const { error } = await supabase.from('ordenes_directa').update({ forma_pago: valor || null }).eq('nro_ot', nroOt);
    if (error) alert('Error: ' + error.message);
    else onCambio();
  }

  // % de recargo según la forma de pago elegida. Sin cargo no suma nada;
  // Cuenta Recaudadora +3,5%; IVA +21%. Se aplica sobre el subtotal ya
  // con el descuento restado (primero descuento, después recargo).
  // Envío: monto fijo en pesos, cargado a mano por OT (no es un %).
  async function actualizarEnvioOt(nroOt: string, monto: number | null) {
    const { error } = await supabase.from('ordenes_directa').update({ envio: monto }).eq('nro_ot', nroOt);
    if (error) alert('Error: ' + error.message);
    else onCambio();
  }

  // % de anticipo requerido, cargado a mano (mismo patrón que descuento).
  async function actualizarAnticipoPctOt(nroOt: string, pct: number | null) {
    const { error } = await supabase.from('ordenes_directa').update({ anticipo_pct: pct }).eq('nro_ot', nroOt);
    if (error) alert('Error: ' + error.message);
    else onCambio();
  }

  function calcularAnticipoMonto(grupo: OrdenDirecta[]): number {
    const subtotal = grupo.reduce((acc, o) => acc + calcularImporteNumero(o), 0);
    const pct = grupo[0].anticipo_pct || 0;
    return Math.round((subtotal * pct) / 100);
  }

  // Total = Subtotal - Descuento + Impuesto o cargo + Envío - Anticipo (lo
  // que ya se le pide de anticipo al cliente se resta, así el Total que
  // queda es el saldo restante a cobrar). El recargo se calcula sobre el
  // subtotal ya con el descuento restado (el anticipo no altera esa base).
  function calcularTotalOt(grupo: OrdenDirecta[]): number {
    const subtotal = grupo.reduce((acc, o) => acc + calcularImporteNumero(o), 0);
    const descuentoPct = grupo[0].descuento_pct || 0;
    const baseConDescuento = subtotal - Math.round((subtotal * descuentoPct) / 100);
    const recargoPct = porcentajeRecargo(grupo[0].forma_pago);
    const recargoMonto = Math.round((baseConDescuento * recargoPct) / 100);
    const envio = Number(grupo[0].envio) || 0;
    const anticipoMonto = calcularAnticipoMonto(grupo);
    return baseConDescuento + recargoMonto + envio - anticipoMonto;
  }

  // Orden fijo por id (más viejo primero), para que la fila de un pedido
  // no cambie de lugar cada vez que se edita algo y se refresca la lista.
  const pendientesAnticipo = ordenes.filter((o) => o.anticipo === 'PENDIENTE').sort((a, b) => a.id - b.id);

  // Descripción consolidada de la tela para la tabla de Administración.
  // Si es tela HYPE (el nombre arranca con "HYPE", como siempre se cargan
  // desde el catálogo TELAS_HYPE_TH), se muestra directo la descripción
  // tal cual — ej. "HYPE BULL" — sin color, porque la tela HYPE no tiene
  // variantes de color. Si es tela cliente, se muestra "TELA CLIENTE -
  // {tela} - {color}" (sin color si no hay).
  function descripcionTelaConsolidada(o: OrdenDirecta): string {
    const tela = (o.tela || '').trim();
    if (!tela) return '—';
    const esHype = /^hype\b/i.test(tela);
    if (esHype) return tela.toUpperCase();
    const partes = ['TELA CLIENTE', tela.toUpperCase()];
    if (o.color) partes.push(o.color.toUpperCase());
    return partes.join(' - ');
  }

  // Formatea el precio por metro lineal con el formato pedido: "$" + 6
  // dígitos numéricos, completando con ceros a la izquierda (ej. escribe
  // "150" y queda "$000150"). Si no hay ningún dígito cargado, null.
  function formatearPrecioMtSeisDigitos(valor: string): string | null {
    const soloDigitos = (valor || '').replace(/\D/g, '');
    if (!soloDigitos) return null;
    return '$' + soloDigitos.slice(0, 6).padStart(6, '0');
  }

  // Importe = Mts Pedidos x $ x Mt Lineal, se calcula solo (no se guarda,
  // se recalcula siempre a partir de esos dos campos). Si todavía no se
  // cargó el precio, no hay nada para calcular.
  function calcularImporte(o: OrdenDirecta): string {
    const importe = calcularImporteNumero(o);
    if (!importe) return '—';
    return '$' + importe.toLocaleString('es-AR');
  }

  function calcularImporteNumero(o: OrdenDirecta): number {
    const precio = Number((o.precio_mt || '').replace(/\D/g, '')) || 0;
    if (!precio) return 0;
    return Math.round((o.mts_pedidos || 0) * precio);
  }

  // Agrupa las líneas de "Pendientes de anticipo" por Nro OT, para poder
  // mostrar un renglón de Subtotal (suma de los Importe de esa OT) al
  // final de cada grupo — una OT puede tener varios diseños/líneas.
  const gruposPendientesPorOt = (() => {
    const mapa = new Map<string, OrdenDirecta[]>();
    pendientesAnticipo.forEach((o) => {
      const arr = mapa.get(o.nro_ot) || [];
      arr.push(o);
      mapa.set(o.nro_ot, arr);
    });
    return Array.from(mapa.values());
  })();

  // Agrupa los renglones (diseños) por nro_ot. Una OT se considera
  // "terminada" recién cuando TODOS sus diseños tienen Fecha fin cargada
  // (no alcanza con que uno solo la tenga). Se descartan las que ya se
  // marcaron como "cliente avisado".
  const otsTerminadas = (() => {
    const porOt = new Map<string, OrdenDirecta[]>();
    ordenes.forEach((o) => {
      const arr = porOt.get(o.nro_ot) || [];
      arr.push(o);
      porOt.set(o.nro_ot, arr);
    });
    return Array.from(porOt.values())
      .filter((filas) => filas.length > 0 && filas.every((f) => f.fecha_fin) && !filas[0].cliente_avisado)
      .sort((a, b) => a[0].nro_ot.localeCompare(b[0].nro_ot));
  })();

  // La OT queda "terminada" cuando el último de sus diseños completa
  // Fecha fin — por eso se muestra la más reciente del grupo (pueden no
  // ser todas iguales si los diseños se fijaron en días distintos).
  function fechaFinOt(filas: OrdenDirecta[]): string | null {
    const fechas = filas.map((f) => f.fecha_fin).filter((f): f is string => !!f);
    if (fechas.length === 0) return null;
    return fechas.reduce((max, f) => (f > max ? f : max));
  }

  function textoReporte(filas: OrdenDirecta[]): string {
    const lineas = filas.map((f) => `• ${f.diseno} — ${f.mts_impresos} mts — ${f.tela || 'sin tela'}`).join('\n');
    return `Fecha fin: ${formatFecha(fechaFinOt(filas))} — Pedido OT ${filas[0].nro_ot} — ${filas[0].cliente}\n${lineas}`;
  }

  function imprimirReporte(filas: OrdenDirecta[]) {
    const texto = textoReporte(filas);
    const ventana = window.open('', '_blank', 'width=500,height=600');
    if (!ventana) {
      alert('El navegador bloqueó la ventana de impresión. Habilitá las ventanas emergentes para este sitio e intentá de nuevo.');
      return;
    }
    ventana.document.write(`<html><head><title>OT ${filas[0].nro_ot}</title></head><body style="font-family: Arial, sans-serif; padding: 24px; white-space: pre-wrap; font-size: 16px;">${texto.replace(/\n/g, '<br/>')}</body></html>`);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  // Dibuja la tabla del pedido (Fecha Fin/Nro OT/Cliente/Diseño/Mts Imp/Tela)
  // en un canvas, para copiarla al portapapeles como imagen (o, si el
  // navegador no lo permite, descargarla como JPG).
  function generarCanvasReporte(filas: OrdenDirecta[]): HTMLCanvasElement | null {
    const columnas = ['Fecha Fin', 'Nro OT', 'Cliente', 'Diseño', 'Mts Imp', 'Tela'];
    const anchoCol = [110, 130, 170, 220, 90, 170];
    const anchoTotal = anchoCol.reduce((a, b) => a + b, 0);
    const altoHeader = 40;
    const altoFila = 36;
    const padding = 16;
    const alto = padding * 2 + altoHeader + filas.length * altoFila;

    const canvas = document.createElement('canvas');
    canvas.width = anchoTotal + padding * 2;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    function truncar(texto: string, maxAncho: number): string {
      if (ctx!.measureText(texto).width <= maxAncho) return texto;
      let t = texto;
      while (t.length > 1 && ctx!.measureText(t + '…').width > maxAncho) t = t.slice(0, -1);
      return t + '…';
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let x = padding;
    ctx.font = 'bold 13px Arial';
    columnas.forEach((col, i) => {
      ctx.fillStyle = '#8e6fc9';
      ctx.fillRect(x, padding, anchoCol[i], altoHeader);
      ctx.strokeStyle = '#ccc';
      ctx.strokeRect(x, padding, anchoCol[i], altoHeader);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(col.toUpperCase(), x + anchoCol[i] / 2, padding + altoHeader / 2);
      x += anchoCol[i];
    });

    ctx.font = '12px Arial';
    filas.forEach((f, fi) => {
      const y = padding + altoHeader + fi * altoFila;
      const valores = [formatFecha(f.fecha_fin), f.nro_ot, f.cliente, f.diseno, String(f.mts_impresos), f.tela || '—'];
      let xx = padding;
      valores.forEach((val, ci) => {
        ctx!.fillStyle = fi % 2 === 0 ? '#f7f4fc' : '#ffffff';
        ctx!.fillRect(xx, y, anchoCol[ci], altoFila);
        ctx!.strokeStyle = '#ccc';
        ctx!.strokeRect(xx, y, anchoCol[ci], altoFila);
        ctx!.fillStyle = '#000000';
        ctx!.fillText(truncar(String(val), anchoCol[ci] - 10), xx + anchoCol[ci] / 2, y + altoFila / 2);
        xx += anchoCol[ci];
      });
    });

    return canvas;
  }

  function descargarImagen(canvas: HTMLCanvasElement, nroOt: string) {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `OT_${nroOt}.jpg`;
    link.click();
  }

  // Copia la tabla directamente como imagen al portapapeles (así se pega
  // tal cual en WhatsApp con Cmd+V/Ctrl+V). Si el navegador no permite
  // copiar imágenes al portapapeles, se descarga el archivo JPG en su lugar.
  async function copiarReporte(filas: OrdenDirecta[]) {
    const canvas = generarCanvasReporte(filas);
    if (!canvas) { alert('No se pudo generar la imagen en este navegador.'); return; }
    try {
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('sin blob'))), 'image/png');
      });
      const ClipboardItemCtor = (window as any).ClipboardItem;
      if (!ClipboardItemCtor) throw new Error('ClipboardItem no soportado');
      await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
      alert('Imagen copiada. Ahora pegala directo en WhatsApp (Cmd+V o Ctrl+V).');
    } catch (err) {
      console.error('No se pudo copiar la imagen al portapapeles:', err);
      descargarImagen(canvas, filas[0].nro_ot);
      alert('Tu navegador no permite copiar la imagen directamente, así que se descargó el archivo — adjuntalo desde ahí en WhatsApp.');
    }
  }

  async function marcarAvisado(nroOt: string) {
    if (!confirm(`¿Marcar el pedido ${nroOt} como "cliente avisado"? Va a desaparecer de esta lista.`)) return;
    const { error } = await supabase.from('ordenes_directa').update({ cliente_avisado: true }).eq('nro_ot', nroOt);
    if (error) { alert('Error: ' + error.message); return; }
    onCambio();
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, textTransform: 'uppercase' }}>Administración</div>
      </div>

      <style>{`
        .adm-grid th, .adm-grid td { border: 1px solid #ddd !important; text-align: center !important; }
      `}</style>

      <div style={{ marginTop: 32 }}>
        <PanelCotizacionesOt cotizacionesOt={cotizacionesOt} nombreUsuario={nombreUsuario} onCambio={onCambio} />
      </div>

      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, color: '#e85d2f' }}>
          Pendientes de anticipo ({pendientesAnticipo.length})
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Al cargar un pedido nuevo, arranca en PENDIENTE por default hasta que se marque PAGADO o N/A.</div>
        <div style={{ ...card, padding: 0, overflow: 'hidden', border: '1px solid #f3c9c9' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-grid" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['OT', 'Cliente', 'Diseño', 'Observaciones', 'Mts Ped', 'Tela', '$ x Mt Lineal', 'Importe', 'Anticipo'].map((h) => (
                    <th key={h} style={{ ...th, background: '#e85d2f', color: '#fff', textTransform: 'uppercase', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gruposPendientesPorOt.map((grupo) => (
                  <Fragment key={grupo[0].nro_ot}>
                    {grupo.map((o) => (
                      <tr key={o.id} style={{ background: '#fef3f3' }}>
                        <td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f' }}>{o.nro_ot}</td>
                        <td style={td}>{o.cliente}</td>
                        <td style={td}>{o.diseno}</td>
                        <td style={td}>{o.observaciones || '—'}</td>
                        <td style={td}>{o.mts_pedidos}</td>
                        <td style={td}>{descripcionTelaConsolidada(o)}</td>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                            <span style={{ fontWeight: 700 }}>$</span>
                            <input
                              defaultValue={Number((o.precio_mt || '').replace(/\D/g, '')) || ''}
                              onBlur={(e) => actualizar(o.id, 'precio_mt', formatearPrecioMtSeisDigitos(e.target.value))}
                              placeholder="000000"
                              inputMode="numeric"
                              style={{ ...selSm, width: 80, textAlign: 'center' }}
                            />
                          </div>
                        </td>
                        <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>{calcularImporte(o)}</td>
                        <td style={td}>
                          <select value={o.anticipo} onChange={(e) => actualizar(o.id, 'anticipo', e.target.value)} style={selSm}>
                            {ANTICIPO_OPCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#fde3d3' }}>
                      <td colSpan={7} style={{ ...td, textAlign: 'right' }}>
                        <div style={filaResumenFila}>
                          <span style={filaResumenLabel}>Subtotal</span>
                          <span></span>
                        </div>
                      </td>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>
                        ${grupo.reduce((acc, o) => acc + calcularImporteNumero(o), 0).toLocaleString('es-AR')}
                      </td>
                      <td style={td}></td>
                    </tr>
                    <tr style={{ background: '#fde3d3' }}>
                      <td colSpan={7} style={{ ...td, textAlign: 'right' }}>
                        <div style={filaResumenFila}>
                          <span style={filaResumenLabel}>Desc.</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              defaultValue={grupo[0].descuento_pct ?? ''}
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                actualizarDescuentoOt(grupo[0].nro_ot, val ? Number(val) : null);
                              }}
                              placeholder="0"
                              inputMode="decimal"
                              style={{ ...selSm, width: 55, textAlign: 'center' }}
                            />
                            <span>%</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: '#c00' }}>
                        {(() => {
                          const subtotal = grupo.reduce((acc, o) => acc + calcularImporteNumero(o), 0);
                          const pct = grupo[0].descuento_pct || 0;
                          if (!pct) return '—';
                          const monto = Math.round((subtotal * pct) / 100);
                          return `-$${monto.toLocaleString('es-AR')}`;
                        })()}
                      </td>
                      <td style={td}></td>
                    </tr>
                    <tr style={{ background: '#fde3d3' }}>
                      <td colSpan={7} style={{ ...td, textAlign: 'right' }}>
                        <div style={filaResumenFila}>
                          <span style={{ ...filaResumenLabel, lineHeight: 1.1 }}>Imp.<br />o Cargo</span>
                          <select
                            value={grupo[0].forma_pago || ''}
                            onChange={(e) => actualizarFormaPagoOt(grupo[0].nro_ot, e.target.value)}
                            style={selSm}
                          >
                            <option value="">Seleccionar</option>
                            <option value="SIN CARGO">Sin cargo</option>
                            <option value="CUENTA RECAUDADORA">Cuenta Recaudadora (+3,5%)</option>
                            <option value="IVA">IVA (+21%)</option>
                          </select>
                        </div>
                      </td>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>
                        {(() => {
                          const subtotal = grupo.reduce((acc, o) => acc + calcularImporteNumero(o), 0);
                          const descuentoPct = grupo[0].descuento_pct || 0;
                          const baseConDescuento = subtotal - Math.round((subtotal * descuentoPct) / 100);
                          const recargoPct = porcentajeRecargo(grupo[0].forma_pago);
                          if (!recargoPct) return '—';
                          const monto = Math.round((baseConDescuento * recargoPct) / 100);
                          return `+$${monto.toLocaleString('es-AR')}`;
                        })()}
                      </td>
                      <td style={td}></td>
                    </tr>
                    <tr style={{ background: '#fde3d3' }}>
                      <td colSpan={7} style={{ ...td, textAlign: 'right' }}>
                        <div style={filaResumenFila}>
                          <span style={filaResumenLabel}>Antic.</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              defaultValue={grupo[0].anticipo_pct ?? ''}
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                actualizarAnticipoPctOt(grupo[0].nro_ot, val ? Number(val) : null);
                              }}
                              placeholder="0"
                              inputMode="decimal"
                              style={{ ...selSm, width: 55, textAlign: 'center' }}
                            />
                            <span>%</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: '#c00' }}>
                        {(() => {
                          const monto = calcularAnticipoMonto(grupo);
                          if (!monto) return '—';
                          return `-$${monto.toLocaleString('es-AR')}`;
                        })()}
                      </td>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>
                        {(() => {
                          const monto = calcularAnticipoMonto(grupo);
                          if (!monto) return '—';
                          return (
                            <>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Debe pagar:</div>
                              <div>${monto.toLocaleString('es-AR')}</div>
                            </>
                          );
                        })()}
                      </td>
                    </tr>
                    <tr style={{ background: '#fde3d3' }}>
                      <td colSpan={7} style={{ ...td, textAlign: 'right' }}>
                        <div style={filaResumenFila}>
                          <span style={filaResumenLabel}>Envío</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontWeight: 700 }}>$</span>
                            <input
                              defaultValue={grupo[0].envio ?? ''}
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                actualizarEnvioOt(grupo[0].nro_ot, val ? Number(val) : null);
                              }}
                              placeholder="0"
                              inputMode="numeric"
                              style={{ ...selSm, width: 90, textAlign: 'center' }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>
                        {grupo[0].envio ? `+$${Number(grupo[0].envio).toLocaleString('es-AR')}` : '—'}
                      </td>
                      <td style={td}></td>
                    </tr>
                    <tr style={{ background: '#e85d2f' }}>
                      <td colSpan={7} style={{ ...td, textAlign: 'right' }}>
                        <div style={filaResumenFila}>
                          <span style={{ ...filaResumenLabel, color: '#fff' }}>Total</span>
                          <span></span>
                        </div>
                      </td>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: '#fff', fontSize: 14 }}>
                        ${calcularTotalOt(grupo).toLocaleString('es-AR')}
                      </td>
                      <td style={td}></td>
                    </tr>
                  </Fragment>
                ))}
                {pendientesAnticipo.length === 0 && (
                  <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: '#888' }}>No hay pedidos pendientes de anticipo 🎉</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, color: '#8e6fc9' }}>
          Trabajos terminados, listos para avisar al cliente ({otsTerminadas.length})
        </div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
          Aparecen acá solo cuando TODOS los diseños de esa OT ya tienen Fecha fin. "Copiar" copia la tabla como imagen — pegala directo en WhatsApp con Cmd+V/Ctrl+V; "Imprimir" abre una hoja simple para imprimir. Una vez avisado al cliente, tildá "Cliente avisado" y desaparece de la lista.
        </div>
        <div style={{ ...card, padding: 0, overflow: 'hidden', border: '1px solid #ddd6f0' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-grid" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Fecha Fin', 'Nro OT', 'Cliente', 'Diseño', 'Mts Imp', 'Tela', 'Acciones'].map((h) => (
                    <th key={h} style={{ ...th, background: '#8e6fc9', color: '#fff', textTransform: 'uppercase', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {otsTerminadas.length === 0 && (
                  <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#888' }}>No hay OTs completas pendientes de avisar</td></tr>
                )}
                {otsTerminadas.flatMap((filas) =>
                  filas.map((f, i) => (
                    <tr key={f.id} style={{ background: '#f7f4fc' }}>
                      {i === 0 && (
                        <>
                          <td rowSpan={filas.length} style={{ ...td, fontWeight: 600, color: '#8e6fc9' }}>{formatFecha(fechaFinOt(filas))}</td>
                          <td rowSpan={filas.length} style={{ ...td, fontFamily: 'monospace', color: '#e85d2f', fontWeight: 700 }}>{filas[0].nro_ot}</td>
                          <td rowSpan={filas.length} style={td}>{filas[0].cliente}</td>
                        </>
                      )}
                      <td style={td}>{f.diseno}</td>
                      <td style={td}>{f.mts_impresos}</td>
                      <td style={td}>{f.tela || '—'}</td>
                      {i === 0 && (
                        <td rowSpan={filas.length} style={td}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                            <button onClick={() => copiarReporte(filas)} style={{ ...btn, padding: '4px 8px', fontSize: 11 }}>📋 Copiar</button>
                            <button onClick={() => imprimirReporte(filas)} style={{ ...btn, padding: '4px 8px', fontSize: 11 }}>🖨️ Imprimir</button>
                            <button onClick={() => marcarAvisado(filas[0].nro_ot)} style={{ ...btn, padding: '4px 8px', fontSize: 11, background: '#3B6D11', color: '#fff', borderColor: '#3B6D11' }}>✓ Cliente avisado</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Producción (antes "Vista General"): todas las OT, todos los campos, en una sola tabla —
// para quien quiera ver/tocar todo en un solo lugar en vez de entrar
// panel por panel. Cualquier rol puede editar cualquier celda acá.
// ---------------------------------------------------------------------------
// Qué campo puede editar cada rol dentro de la tabla de Producción
// (vuelve al circuito original por rol, ahora aplicado campo por campo
// en vez de pantalla por pantalla). admin siempre puede editar todo.
const CAMPOS_ROL: Record<string, string[]> = {
  diseno: ['fecha', 'equipo', 'cliente', 'diseno', 'mts_pedidos', 'tela', 'aprob', 'post', 'observaciones'],
  administrativo: ['entregar', 'tipo_rto', 'observaciones'],
  operario: ['imp_operario', 'mts_impresos'],
  encargado: ['imp_operario', 'mts_impresos', 'prep', 'fija_operario', 'fecha_fin', 'nro_rto', 'bulto_actual', 'bulto_total', 'estado_entrega', 'entrego', 'recibio', 'observaciones'],
  logistica: ['fija_operario', 'fecha_fin', 'prep', 'nro_rto', 'bulto_actual', 'bulto_total', 'estado_entrega', 'entrego', 'recibio', 'observaciones'],
  comercial: [],
};

function VistaGeneral({ ordenes, onCambio, rol }: { ordenes: OrdenDirecta[]; onCambio: () => void; rol: string }) {
  const [search, setSearch] = useState('');
  // Si el pedido no tiene color cargado, no se muestra ningún campo vacío
  // en la columna Tela/Color — solo un "+ color" chiquito para agregarlo
  // cuando haga falta. Este set guarda qué filas tienen ese campo abierto
  // para escribir (mientras no se guarde nada, o esté vacío, no se ve).
  const [editandoColor, setEditandoColor] = useState<Set<number>>(new Set());
  const FILTROS_ESTADO = ['FICHAR CN', 'FICHAR CR', 'EN PROCESO'] as const;
  const [filtroEstado, setFiltroEstado] = useState('');
  const prioridad = calcularPrioridad(ordenes);
  const esAdmin = rol.trim() === 'admin';
  // Campos que son "producir" propiamente dicho: no se pueden tocar si
  // Prod dice NO (falta anticipo, aprobación o tela preparada), salvo admin.
  // Aprob y Prep quedan afuera de esta lista a propósito: son justamente
  // los que hay que completar para que Prod pase a decir SÍ.
  const CAMPOS_PRODUCCION = ['imp_operario', 'mts_impresos', 'fija_operario', 'fecha_fin', 'nro_rto', 'bulto_actual', 'bulto_total', 'estado_entrega', 'entrego', 'recibio', 'entregar', 'tipo_rto'];
  // Una vez que el pedido tiene Fecha fin (se marcó "terminado" a mano),
  // se "congela": nadie salvo admin puede seguir editando esa fila. La
  // única excepción es el propio campo fecha_fin: es la manija para volver
  // a abrir el pedido (revertir "terminado"), así que tiene que quedar
  // accesible aunque la fila esté congelada — si no, nadie podría revertirlo.
  const puede = (o: OrdenDirecta, campo: string) => {
    if (esAdmin) return true;
    if (o.fecha_fin && campo !== 'fecha_fin') return false;
    if (CAMPOS_PRODUCCION.includes(campo) && !o.puede_producir) return false;
    return (CAMPOS_ROL[rol.trim()] || []).includes(campo);
  };

  async function actualizar(id: number, campo: string, valor: any) {
    const { error } = await supabase.from('ordenes_directa').update({ [campo]: valor }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else onCambio();
  }

  // "Terminado" ahora es una acción explícita (antes se ponía sola apenas
  // se cargaba Op Fij, y eso congelaba la fila sin poder revertir nada).
  // Marcar pone la fecha de hoy; revertir la vuelve a dejar en null y la
  // fila se destraba de nuevo para seguir editándola.
  async function marcarTerminado(o: OrdenDirecta) {
    const hoy = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('ordenes_directa').update({ fecha_fin: hoy }).eq('id', o.id);
    if (error) { alert('Error: ' + error.message); return; }
    onCambio();
  }

  async function revertirTerminado(o: OrdenDirecta) {
    if (!confirm('¿Revertir "terminado"? El pedido vuelve a quedar abierto y editable.')) return;
    const { error } = await supabase.from('ordenes_directa').update({ fecha_fin: null }).eq('id', o.id);
    if (error) { alert('Error: ' + error.message); return; }
    onCambio();
  }

  // Lista de nro_ot en el orden actual (por orden_manual). Se usa para
  // mover una OT completa (todos sus diseños juntos) un lugar arriba o
  // abajo con las flechas ↑↓.
  function otsEnOrden(): string[] {
    const porOt = new Map<string, OrdenDirecta[]>();
    ordenes.forEach((o) => {
      const arr = porOt.get(o.nro_ot) || [];
      arr.push(o);
      porOt.set(o.nro_ot, arr);
    });
    return Array.from(porOt.entries())
      .map(([nroOt, filas]) => ({ nroOt, orden: filas[0].orden_manual ?? Math.min(...filas.map((f) => f.id)) }))
      .sort((a, b) => a.orden - b.orden)
      .map((x) => x.nroOt);
  }

  async function moverOt(nroOt: string, direccion: -1 | 1) {
    const lista = otsEnOrden();
    const idx = lista.indexOf(nroOt);
    const destino = idx + direccion;
    if (destino < 0 || destino >= lista.length) return;
    [lista[idx], lista[destino]] = [lista[destino], lista[idx]];
    const { error } = await (async () => {
      for (const [i, ot] of lista.entries()) {
        const { error: errorFila } = await supabase.from('ordenes_directa').update({ orden_manual: i + 1 }).eq('nro_ot', ot);
        if (errorFila) return { error: errorFila };
      }
      return { error: null };
    })();
    if (error) { alert('Error al reordenar: ' + error.message); return; }
    onCambio();
  }

  // Anula (borra) un pedido. También borra el/los egreso(s) de Stock que
  // se hayan generado para esa OT (por ejemplo, la reserva de tela HYPE
  // cargada al ingresar el pedido), para que el stock quede liberado y
  // no arrastre una reserva "fantasma" de un pedido que ya no existe.
  async function anularPedido(o: OrdenDirecta) {
    if (!confirm(`¿Anular el pedido ${o.nro_ot} — ${o.cliente} — ${o.diseno}?\n\nEsto también libera el stock reservado para este pedido (si lo hay). No se puede deshacer.`)) return;
    const { error: errorEgresos } = await supabase.from('egresos').delete().eq('orden_id', o.id);
    if (errorEgresos) console.error('No se pudo liberar el stock reservado de este pedido:', errorEgresos);
    const { error } = await supabase.from('ordenes_directa').delete().eq('id', o.id);
    if (error) { alert('Error al anular: ' + error.message); return; }
    onCambio();
  }

  // Busca en Stock el id_hype que corresponde a esta combinación de
  // cliente + tela, y lo completa solo en la columna ID.
  async function buscarCodTela(o: OrdenDirecta, telaTexto?: string) {
    const tela = (telaTexto ?? o.tela) || '';
    if (!o.cliente || !tela) return;
    const disponibles = await stockPorCliente(o.cliente);
    const coincidencias = disponibles.filter((s) => s.tela.trim().toLowerCase() === tela.trim().toLowerCase());
    if (coincidencias.length === 0) return; // no hay match, no molesta con un alert
    // si hay varias, toma la de mayor stock disponible
    const mejor = coincidencias.sort((a, b) => b.disponible - a.disponible)[0];
    await actualizar(o.id, 'cod_tela', mejor.id_hype);
  }

  // Al elegir un operario en "Op Imp" se pinta la fila de verde. El "no
  // se pudo imprimir" ahora se marca desde la columna Mts Imp (ver
  // marcarNoImpreso/revertirNoImpreso), no acá.
  async function actualizarImpOperario(o: OrdenDirecta, valor: string) {
    const { error } = await supabase.from('ordenes_directa').update({ imp_operario: valor || null, motivo_no_impreso: null }).eq('id', o.id);
    if (error) alert('Error: ' + error.message);
    else onCambio();
  }

  // Se dispara desde un botón en la columna Mts Imp: pide el motivo por
  // el que no se pudo imprimir y pinta la fila de rojo. Reemplaza a la
  // vieja opción "NO" del desplegable de Op Imp.
  async function marcarNoImpreso(o: OrdenDirecta) {
    const motivo = window.prompt('¿Por qué no se pudo imprimir este pedido?', o.motivo_no_impreso || '');
    if (motivo === null) return; // canceló, no guarda nada
    const { error } = await supabase.from('ordenes_directa').update({ imp_operario: 'NO', motivo_no_impreso: motivo }).eq('id', o.id);
    if (error) alert('Error: ' + error.message);
    else onCambio();
  }

  async function revertirNoImpreso(o: OrdenDirecta) {
    const { error } = await supabase.from('ordenes_directa').update({ imp_operario: null, motivo_no_impreso: null }).eq('id', o.id);
    if (error) alert('Error: ' + error.message);
    else onCambio();
  }

  // Igual que en el panel de Impresión: al cambiar los mts impresos,
  // además de guardar en la OT, descuenta ese consumo como egreso real
  // en Stock (si esta OT tiene una tela de stock asociada).
  async function actualizarMtsImpresos(o: OrdenDirecta, valor: string) {
    const mtsNuevos = parseFloat(valor);
    if (isNaN(mtsNuevos)) return;
    const { error } = await supabase.from('ordenes_directa').update({ mts_impresos: mtsNuevos }).eq('id', o.id);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    const delta = mtsNuevos - Number(o.mts_impresos || 0);
    // Las telas HYPE (Stock TH) ya se reservaron con los Mts Pedidos al
    // ingresar el pedido (ver FormAltaDiseno) — no se descuenta de nuevo acá.
    // Las telas de cliente se siguen descontando recién ahora, con lo
    // realmente impreso.
    const esTelaTH = (o.cod_tela || '').toUpperCase().startsWith('TH');
    if (o.cod_tela && delta > 0 && !esTelaTH) {
      const { error: errorEgreso } = await supabase.from('egresos').insert([
        {
          fecha: new Date().toISOString().split('T')[0],
          cliente: o.cliente,
          tela: o.tela,
          id_hype: o.cod_tela,
          mts: delta,
          estado: 'A producción',
          observaciones: `OT ${o.nro_ot} · Directa · cargado desde Vista General`,
          orden_id: o.id,
        },
      ]);
      if (errorEgreso) console.error('No se pudo descontar stock automáticamente:', errorEgreso);
    }
    onCambio();
  }

  // Al cargar el Nº de remito de entrega, lo replica en el/los egreso(s)
  // de Stock generados para esta OT (vinculados por orden_id), para no
  // tener que cargarlo dos veces.
  async function actualizarNroRto(o: OrdenDirecta, valor: string) {
    const nuevoValor = valor || null;
    const { error } = await supabase.from('ordenes_directa').update({ nro_rto: nuevoValor }).eq('id', o.id);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    if (nuevoValor) {
      const { error: errorStock } = await supabase.from('egresos').update({ remito: nuevoValor }).eq('orden_id', o.id);
      if (errorStock) console.error('No se pudo actualizar el remito en Stock:', errorStock);
    }
    onCambio();
  }

  // Igual que con el Nº de RTO: quién entregó y quién recibió se replican
  // en el/los egreso(s) de Stock vinculados a esta OT.
  async function actualizarEntrego(o: OrdenDirecta, valor: string) {
    const nuevoValor = valor || null;
    const { error } = await supabase.from('ordenes_directa').update({ entrego: nuevoValor }).eq('id', o.id);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    if (nuevoValor) {
      const { error: errorStock } = await supabase.from('egresos').update({ entrego: nuevoValor }).eq('orden_id', o.id);
      if (errorStock) console.error('No se pudo actualizar quién entregó en Stock:', errorStock);
    }
    onCambio();
  }

  async function actualizarRecibio(o: OrdenDirecta, valor: string) {
    const nuevoValor = valor || null;
    const { error } = await supabase.from('ordenes_directa').update({ recibio: nuevoValor }).eq('id', o.id);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    if (nuevoValor) {
      const { error: errorStock } = await supabase.from('egresos').update({ recibio: nuevoValor }).eq('orden_id', o.id);
      if (errorStock) console.error('No se pudo actualizar quién recibió en Stock:', errorStock);
    }
    onCambio();
  }

  const filtradas = ordenes
    .filter((o) => {
      if (filtroEstado && o.aprob !== filtroEstado) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        o.nro_ot.toLowerCase().includes(q) ||
        o.cliente.toLowerCase().includes(q) ||
        o.diseno.toLowerCase().includes(q) ||
        (o.tela || '').toLowerCase().includes(q)
      );
    })
    // Pedido más viejo (N 1) arriba, más nuevo abajo — mismo orden que la columna N.
    .sort((a, b) => (prioridad.get(a.id) || 0) - (prioridad.get(b.id) || 0));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, textTransform: 'uppercase' }}>Producción</div>
          <div style={{ fontSize: 13, color: '#888' }}>Todos los pedidos y todos los campos, editable por cualquiera</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ ...inp, maxWidth: 160 }}>
            <option value="">Todos los estados</option>
            {FILTROS_ESTADO.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <input placeholder="Buscar por OT, cliente, diseño o tela..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inp, maxWidth: 280 }} />
        </div>
      </div>
      <style>{`
        .vg-grid th, .vg-grid td { border: 1px solid #ddd !important; text-align: center !important; }
      `}</style>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="vg-grid" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['N', 'Prod', 'Fecha Pedido', 'Equipo', 'Nro OT', 'Cliente', 'Diseño', 'Mts Ped', 'Mts Imp', 'Observaciones', 'Tela / Color', 'ID', 'Aprob', 'Op Imp', 'Post', 'Op Fij', 'Fecha fin', 'Prep', '¿Entregar?', 'Tipo RTO', 'Nº RTO', 'Bultos', 'Estado entrega', 'Entregó', 'Recibió', 'Anular'].map((h) => {
                  const esEntregaEnAdelante = ['¿Entregar?', 'Tipo RTO', 'Nº RTO', 'Bultos', 'Estado entrega', 'Entregó', 'Recibió'].includes(h);
                  return (
                    <th key={h} style={{ ...th, textTransform: 'uppercase', background: esEntregaEnAdelante ? '#8e6fc9' : '#e85d2f', color: '#fff', fontWeight: 700, ...(h === 'Prod' ? { width: 40 } : {}) }}>{h}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && <tr><td colSpan={26} style={{ ...td, textAlign: 'center', color: '#888' }}>Sin pedidos</td></tr>}
              {filtradas.map((o) => {
                // El verde/rojo de "impreso" ahora solo tiñe las celdas de N
                // hasta Op Imp (no toda la fila), y el verde únicamente
                // aparece cuando YA se cargaron Mts Imp Y Op Imp juntos —
                // no alcanza con uno solo de los dos. El verde oscuro de
                // Fecha fin (pedido terminado) sigue siendo toda la fila,
                // porque es un estado distinto (posterior).
                const terminado = !!o.fecha_fin;
                const noImprimio = o.imp_operario === 'NO';
                const impresoCompleto = !noImprimio && !!o.imp_operario && Number(o.mts_impresos) > 0;
                // Si no se pudo imprimir, el rojo pinta toda la fila (igual que en
                // Muestras) en vez de solo las celdas hasta Op Imp.
                const bgCelda = !terminado && !noImprimio && impresoCompleto ? { background: '#e6f4e1' } : {};
                return (
                <tr key={o.id} style={terminado ? { background: '#8fce8a' } : noImprimio ? { background: '#fde8e8' } : undefined}>
                  <td style={{ ...td, color: '#888', ...bgCelda }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      {prioridad.get(o.id)}
                      {esAdmin && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <button onClick={() => moverOt(o.nro_ot, -1)} title="Subir esta OT" style={{ border: 'none', background: '#eee', borderRadius: 3, cursor: 'pointer', fontSize: 8, lineHeight: '10px', padding: '1px 3px' }}>▲</button>
                          <button onClick={() => moverOt(o.nro_ot, 1)} title="Bajar esta OT" style={{ border: 'none', background: '#eee', borderRadius: 3, cursor: 'pointer', fontSize: 8, lineHeight: '10px', padding: '1px 3px' }}>▼</button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ ...td, width: 40, ...bgCelda }}>
                    <span style={{ padding: '2px 6px', borderRadius: 12, fontSize: 10, fontWeight: 700, color: '#fff', background: o.puede_producir ? '#3B6D11' : '#c00' }}>
                      {o.puede_producir ? 'SÍ' : 'NO'}
                    </span>
                  </td>
                  <td style={{ ...td, minWidth: 140, ...bgCelda }}><input type="date" defaultValue={o.fecha} onBlur={(e) => actualizar(o.id, 'fecha', e.target.value)} disabled={!puede(o, 'fecha')} style={{ ...selSm, width: '100%', minWidth: 130 }} /></td>
                  <td style={{ ...td, width: 100, ...bgCelda }}>
                    <select value={o.equipo || ''} onChange={(e) => actualizar(o.id, 'equipo', e.target.value || null)} disabled={!puede(o, 'equipo')} style={{ ...selSm, textTransform: 'uppercase', color: colorEquipo(o.equipo), fontWeight: colorEquipo(o.equipo) ? 700 : undefined }}>
                      <option value="">—</option>{EQUIPOS.map((eq) => <option key={eq} value={eq} style={{ textTransform: 'uppercase' }}>{eq}</option>)}
                    </select>
                  </td>
                  <td style={{ ...td, width: 55, fontFamily: 'monospace', color: '#e85d2f', ...bgCelda }} title={o.nro_ot}>{o.nro_ot.slice(-6)}</td>
                  <td style={{ ...td, minWidth: 170, ...bgCelda }}><input defaultValue={o.cliente} onBlur={(e) => actualizar(o.id, 'cliente', e.target.value)} disabled={!puede(o, 'cliente')} style={{ ...selSm, width: '100%', minWidth: 160 }} /></td>
                  <td style={{ ...td, minWidth: 170, ...bgCelda }}><input defaultValue={o.diseno} onBlur={(e) => actualizar(o.id, 'diseno', e.target.value)} disabled={!puede(o, 'diseno')} style={{ ...selSm, width: '100%', minWidth: 160 }} /></td>
                  <td style={{ ...td, ...bgCelda }}>
                    <input type="number" defaultValue={o.mts_pedidos} onBlur={(e) => actualizar(o.id, 'mts_pedidos', parseFloat(e.target.value) || 0)} disabled={!puede(o, 'mts_pedidos')} style={{ ...selSm, width: 60 }} />
                  </td>
                  <td style={{ ...td, ...bgCelda }} title={o.motivo_no_impreso || undefined}>
                    {o.imp_operario === 'NO' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontSize: 10, color: '#c00', fontWeight: 700 }}>NO IMPRESO</span>
                        {puede(o, 'imp_operario') && (
                          <button onClick={() => revertirNoImpreso(o)} style={{ ...btn, padding: '1px 6px', fontSize: 9, color: '#c00', borderColor: '#c00' }}>revertir</button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <input type="number" defaultValue={o.mts_impresos} onBlur={(e) => actualizarMtsImpresos(o, e.target.value)} disabled={!puede(o, 'mts_impresos')} style={{ ...selSm, width: 50 }} />
                        {puede(o, 'imp_operario') && (
                          <button onClick={() => marcarNoImpreso(o)} title="No se pudo imprimir" style={{ ...btn, padding: '2px 5px', fontSize: 9, color: '#c00', borderColor: '#c00' }}>NO</button>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, minWidth: 260, whiteSpace: 'normal', ...bgCelda }}>
                    <textarea
                      defaultValue={o.observaciones || ''}
                      onBlur={(e) => actualizar(o.id, 'observaciones', e.target.value || null)}
                      disabled={!puede(o, 'observaciones')}
                      rows={2}
                      style={{ ...selSm, width: '100%', minWidth: 250, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </td>
                  <td style={{ ...td, minWidth: 240, ...bgCelda }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input
                        defaultValue={o.tela || ''}
                        onBlur={(e) => { actualizar(o.id, 'tela', e.target.value || null); buscarCodTela(o, e.target.value); }}
                        disabled={!puede(o, 'tela')}
                        placeholder="Tela"
                        style={{ ...selSm, flex: 2, minWidth: 110 }}
                      />
                      {(o.color || editandoColor.has(o.id)) ? (
                        <input
                          autoFocus={!o.color && editandoColor.has(o.id)}
                          defaultValue={o.color || ''}
                          onBlur={(e) => {
                            actualizar(o.id, 'color', e.target.value || null);
                            setEditandoColor((prev) => { const next = new Set(prev); next.delete(o.id); return next; });
                          }}
                          disabled={!puede(o, 'tela')}
                          placeholder="Color"
                          style={{ ...selSm, flex: 1, minWidth: 70 }}
                        />
                      ) : puede(o, 'tela') && (
                        <button
                          onClick={() => setEditandoColor((prev) => new Set(prev).add(o.id))}
                          style={{ border: 'none', background: 'none', color: '#aaa', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', padding: 0 }}
                        >
                          + color
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={{ ...td, width: 70, fontFamily: 'monospace', color: '#000', fontWeight: 700, fontSize: 12, ...bgCelda }}>{o.cod_tela || '—'}</td>
                  <td style={{ ...td, width: 95, ...bgCelda }}>
                    <select value={o.aprob} onChange={(e) => actualizar(o.id, 'aprob', e.target.value)} disabled={!puede(o, 'aprob')} style={{ ...selSm, width: 90, fontSize: 10, padding: '3px 2px' }}>
                      {APROB_OPCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </td>
                  <td style={{ ...td, width: 90, ...bgCelda }}>
                    {o.imp_operario === 'NO' ? (
                      <span style={{ fontSize: 11, color: '#c00' }}>—</span>
                    ) : (
                      <select
                        value={o.imp_operario || ''}
                        onChange={(e) => actualizarImpOperario(o, e.target.value)}
                        disabled={!puede(o, 'imp_operario') || Number(o.mts_impresos || 0) <= 0}
                        title={Number(o.mts_impresos || 0) <= 0 ? 'Primero hay que cargar Mts Imp' : undefined}
                        style={{ ...selSm, width: 85 }}
                      >
                        <option value="">—</option>
                        {OPERARIOS_IMPRESION.map((op) => <option key={op} value={op}>{op}</option>)}
                      </select>
                    )}
                  </td>
                  <td style={td}><input type="checkbox" checked={o.post} onChange={(e) => actualizar(o.id, 'post', e.target.checked)} disabled={!puede(o, 'post')} /></td>
                  <td style={td} title={o.imp_operario === 'NO' ? 'No se puede fijar: no se imprimió' : undefined}>
                    {o.imp_operario === 'NO' ? (
                      <span style={{ fontSize: 11, color: '#c00' }}>—</span>
                    ) : (
                      <select value={o.fija_operario || ''} onChange={(e) => actualizar(o.id, 'fija_operario', e.target.value || null)} disabled={!o.imp_operario || !puede(o, 'fija_operario')} style={selSm}>
                        <option value="">—</option>{OPERARIOS_FIJACION.map((op) => <option key={op} value={op}>{op}</option>)}
                      </select>
                    )}
                  </td>
                  <td style={td}>
                    {o.fecha_fin ? (
                      puede(o, 'fecha_fin') ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <span>{formatFecha(o.fecha_fin)}</span>
                          <button onClick={() => revertirTerminado(o)} style={{ ...btn, padding: '1px 6px', fontSize: 9, color: '#c00', borderColor: '#c00' }}>revertir</button>
                        </div>
                      ) : (
                        formatFecha(o.fecha_fin)
                      )
                    ) : puede(o, 'fecha_fin') ? (
                      <button onClick={() => marcarTerminado(o)} disabled={!o.imp_operario} title={!o.imp_operario ? 'Primero hay que cargar Op Imp' : 'Marcar como terminado hoy'} style={{ ...btn, padding: '2px 6px', fontSize: 10 }}>
                        ✓ Marcar
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={td}>
                    <input type="checkbox" checked={o.prep} onChange={(e) => actualizar(o.id, 'prep', e.target.checked)} disabled={!puede(o, 'prep')} />
                  </td>
                  <td style={td}>
                    <select value={o.entregar === null ? '' : o.entregar ? 'si' : 'no'} onChange={(e) => actualizar(o.id, 'entregar', e.target.value === '' ? null : e.target.value === 'si')} disabled={!puede(o, 'entregar')} style={selSm}>
                      <option value="">—</option><option value="si">Sí</option><option value="no">No</option>
                    </select>
                  </td>
                  <td style={td}>
                    <select value={o.tipo_rto || ''} onChange={(e) => actualizar(o.id, 'tipo_rto', e.target.value || null)} disabled={!puede(o, 'tipo_rto')} style={selSm}>
                      <option value="">—</option>{TIPO_RTO_OPCIONES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={td}><input defaultValue={o.nro_rto || ''} onBlur={(e) => actualizarNroRto(o, e.target.value)} disabled={!puede(o, 'nro_rto')} style={{ ...selSm, width: 80 }} /></td>
                  <td style={td}>
                    <input type="number" placeholder="1" defaultValue={o.bulto_actual || ''} onBlur={(e) => actualizar(o.id, 'bulto_actual', parseInt(e.target.value) || null)} disabled={!puede(o, 'bulto_actual')} style={{ ...selSm, width: 36 }} />
                    /
                    <input type="number" placeholder="1" defaultValue={o.bulto_total || ''} onBlur={(e) => actualizar(o.id, 'bulto_total', parseInt(e.target.value) || null)} disabled={!puede(o, 'bulto_total')} style={{ ...selSm, width: 36 }} />
                  </td>
                  <td style={td}>
                    <select value={o.estado_entrega} onChange={(e) => actualizar(o.id, 'estado_entrega', e.target.value)} disabled={!puede(o, 'estado_entrega')} style={selSm}>
                      {ESTADO_ENTREGA_OPCIONES.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <select value={o.entrego || ''} onChange={(e) => actualizarEntrego(o, e.target.value)} disabled={!puede(o, 'entrego')} style={selSm}>
                      <option value="">—</option>{OPERARIOS_ENTREGA.map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </td>
                  <td style={td}><input defaultValue={o.recibio || ''} onBlur={(e) => actualizarRecibio(o, e.target.value)} disabled={!puede(o, 'recibio')} style={{ ...selSm, width: 80 }} /></td>
                  <td style={td}>
                    {esAdmin ? (
                      <button onClick={() => anularPedido(o)} style={{ ...btn, padding: '4px 8px', fontSize: 11, color: '#c00', borderColor: '#c00' }}>
                        ✕ Anular
                      </button>
                    ) : '—'}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Muestras: tabla independiente de Producción (tabla propia `muestras` en
// Supabase). No se cargan pedidos acá — se agrega cada muestra a mano,
// directamente en la fila en blanco del final (mismo patrón que Reporte
// diario). Mismas columnas y mismo estilo que Producción, pero solo hasta
// Fecha fin: sin columna Prod, sin el condicional de anticipo/tela
// preparada, y sin las columnas de entrega (no aplican a una muestra).
// Descripción completa de una tela de Stock: nombre + color, ej. "FRISA
// AVENA". Se usa tanto para mostrar/completar el campo Tela como para
// volver a matchear esa descripción contra Stock (buscar el ID).
function descripcionTela(s: StockDisponible): string {
  return s.color ? `${s.tela} ${s.color}`.trim() : s.tela;
}

// Formatea el precio por metro con el formato pedido: "$" + al menos 5
// dígitos, completando con ceros a la izquierda (ej. escribe "150" y
// queda "$00150"). Si no hay ningún dígito cargado, devuelve null.
function formatearPrecioMt(valor: string): string | null {
  const soloDigitos = (valor || '').replace(/\D/g, '');
  if (!soloDigitos) return null;
  return '$' + soloDigitos.padStart(5, '0');
}

function muestraVacia() {
  return {
    fecha: new Date().toISOString().split('T')[0],
    equipo: '',
    cliente: '',
    diseno: '',
    mts_pedidos: '',
    tela: '',
    mts_impresos: '',
    observaciones: '',
    imp_operario: '',
    fija_operario: '',
    comercial: '',
    precio_mt: '',
  };
}

function VistaMuestras({ rol, nombreUsuario }: { rol: string; nombreUsuario: string }) {
  // La columna Comercial y la de $ x Mt sólo las puede completar el rol
  // Comercial o un admin.
  const puedeComercial = rol.trim() === 'comercial' || rol.trim() === 'admin';
  const [muestras, setMuestras] = useState<Muestra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nuevo, setNuevo] = useState(muestraVacia());
  const [guardando, setGuardando] = useState(false);
  const esAdmin = rol.trim() === 'admin';

  // Stock disponible por cliente, para sugerir telas ya cargadas en el
  // mismo campo de texto (autocompletado, igual que Cliente) sin dejar
  // de poder escribir cualquier otra tela a mano. Se cachea por cliente
  // para no repetir la consulta en cada fila que comparte cliente.
  const [stockPorClienteCache, setStockPorClienteCache] = useState<Record<string, StockDisponible[]>>({});

  useEffect(() => {
    const clientesUnicos = Array.from(new Set([...muestras.map((m) => m.cliente || ''), nuevo.cliente].filter(Boolean)));
    const faltantes = clientesUnicos.filter((c) => !(c in stockPorClienteCache));
    if (faltantes.length === 0) return;
    (async () => {
      const entradas = await Promise.all(faltantes.map(async (c) => [c, await stockPorCliente(c)] as const));
      setStockPorClienteCache((prev) => {
        const copia = { ...prev };
        entradas.forEach(([c, disp]) => { copia[c] = disp; });
        return copia;
      });
    })();
  }, [muestras, nuevo.cliente]);

  // Autocompletar Cliente desde la base de Stock (misma tabla `clientes`
  // que usa Ingreso y Modif Pedidos: columnas cod — código secuencial tipo
  // "00001" — y nombre).
  const [clientesStock, setClientesStock] = useState<{ cod: string; nombre: string }[]>([]);

  async function cargarClientes() {
    const data = await fetchAll('clientes', 'nombre', true);
    setClientesStock(data.map((c: any) => ({ cod: c.cod, nombre: c.nombre })));
  }

  useEffect(() => {
    cargarClientes();
  }, []);

  // Si el cliente que se escribió no existe todavía en Stock, lo da de
  // alta ahí mismo con el código siguiente al último (mismo formato de 5
  // dígitos con ceros adelante que usa esa tabla, ej: "00001", "00002"...).
  async function asegurarCliente(nombreCliente: string) {
    const nombre = (nombreCliente || '').trim();
    if (!nombre) return;
    const yaExiste = clientesStock.some((c) => (c.nombre || '').trim().toLowerCase() === nombre.toLowerCase());
    if (yaExiste) return;
    const maxCod = clientesStock.reduce((max, c) => {
      const n = parseInt(c.cod, 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const nuevoCod = String(maxCod + 1).padStart(5, '0');
    const { error } = await supabase.from('clientes').insert({ cod: nuevoCod, nombre });
    if (error) { console.error('No se pudo agregar el cliente nuevo a Stock:', error); return; }
    cargarClientes();
  }

  async function cargar() {
    const { data, error } = await supabase.from('muestras').select('*').order('id', { ascending: true });
    if (!error) setMuestras(data || []);
    setCargando(false);
  }

  // Orden de la columna N: por orden_manual (se puede alterar con las
  // flechas ▲▼), y si una fila todavía no tiene orden_manual asignado
  // (filas viejas, antes de este cambio) se usa su id como respaldo para
  // que no salten al principio de la lista.
  const filasOrdenadas = [...muestras].sort((a, b) => (a.orden_manual ?? a.id) - (b.orden_manual ?? b.id));

  async function moverFila(id: number, direccion: -1 | 1) {
    const idx = filasOrdenadas.findIndex((m) => m.id === id);
    const destino = idx + direccion;
    if (destino < 0 || destino >= filasOrdenadas.length) return;
    const lista = [...filasOrdenadas];
    [lista[idx], lista[destino]] = [lista[destino], lista[idx]];
    for (const [i, fila] of lista.entries()) {
      const { error } = await supabase.from('muestras').update({ orden_manual: i + 1 }).eq('id', fila.id);
      if (error) { alert('Error al reordenar: ' + error.message); return; }
    }
    cargar();
  }

  useEffect(() => {
    cargar();
  }, []);

  async function actualizar(id: number, campo: string, valor: any) {
    const { error } = await supabase.from('muestras').update({ [campo]: valor }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else cargar();
  }

  // El "no se pudo imprimir" se marca desde la columna Mts Imp (ver
  // marcarNoImpreso/revertirNoImpreso), no desde acá.
  async function actualizarImpOperario(m: Muestra, valor: string) {
    const { error } = await supabase.from('muestras').update({ imp_operario: valor || null, motivo_no_impreso: null }).eq('id', m.id);
    if (error) alert('Error: ' + error.message);
    else cargar();
  }

  // Se dispara desde un botón en la columna Mts Imp, igual que en
  // Producción: pide el motivo por el que no se pudo imprimir.
  async function marcarNoImpreso(m: Muestra) {
    const motivo = window.prompt('¿Por qué no se pudo imprimir esta muestra?', m.motivo_no_impreso || '');
    if (motivo === null) return;
    const { error } = await supabase.from('muestras').update({ imp_operario: 'NO', motivo_no_impreso: motivo }).eq('id', m.id);
    if (error) alert('Error: ' + error.message);
    else cargar();
  }

  async function revertirNoImpreso(m: Muestra) {
    const { error } = await supabase.from('muestras').update({ imp_operario: null, motivo_no_impreso: null }).eq('id', m.id);
    if (error) alert('Error: ' + error.message);
    else cargar();
  }

  // Busca en Stock la tela que corresponde a cliente + lo que se escribió
  // (matchea tanto contra el nombre solo, ej. "JERSEY 24/1", como contra
  // la descripción completa, ej. "JERSEY 24/1 BLANCO"), y si encuentra,
  // corrige el campo Tela a la descripción completa (nombre + color) y
  // completa Ubic (ubicación en el depósito) — así aunque se haya
  // escrito solo el nombre, queda guardado con el color y la ubicación.
  async function buscarCodTela(m: Muestra, telaTexto?: string) {
    const tela = (telaTexto ?? m.tela) || '';
    if (!tela) return;
    // Las telas que vienen en paquete (nombre con "TCL PAQ") no están en
    // el stock por cliente — no se contabilizan ahí — así que van siempre
    // ubicadas en el carro, sin buscar coincidencia en Stock.
    if (tela.trim().toUpperCase().includes('TCL PAQ')) {
      const { error } = await supabase.from('muestras').update({ ubicacion: 'CARRO' }).eq('id', m.id);
      if (error) console.error('No se pudo actualizar la ubicación:', error);
      else cargar();
      return;
    }
    if (!m.cliente) return;
    const disponibles = await stockPorCliente(m.cliente);
    const telaNorm = tela.trim().toLowerCase();
    const coincidencias = disponibles.filter(
      (s) => descripcionTela(s).trim().toLowerCase() === telaNorm || s.tela.trim().toLowerCase() === telaNorm
    );
    if (coincidencias.length === 0) return;
    const mejor = coincidencias.sort((a, b) => b.disponible - a.disponible)[0];
    const { error } = await supabase.from('muestras').update({ tela: descripcionTela(mejor), cod_tela: mejor.id_hype, ubicacion: mejor.ubicacion }).eq('id', m.id);
    if (error) { console.error('No se pudo actualizar la tela:', error); return; }
    cargar();
  }

  // Al cambiar los Mts Imp, además de guardar en la muestra, descuenta ese
  // consumo como egreso real en Stock (si esta muestra tiene una tela con
  // ID cargado). A diferencia de Producción, acá SIEMPRE se descuenta al
  // cargar Mts Imp (incluidas las telas HYPE "TH"): como Muestras no tiene
  // un paso de "ingreso" que reserve la tela de antemano, este es el único
  // momento en que se registra el consumo real. No se vincula a ninguna OT
  // (orden_id queda vacío) porque esa tabla es de ordenes_directa, no de
  // muestras.
  async function actualizarMtsImpresos(m: Muestra, valor: string) {
    const mtsNuevos = parseFloat(valor);
    if (isNaN(mtsNuevos)) return;
    const { error } = await supabase.from('muestras').update({ mts_impresos: mtsNuevos }).eq('id', m.id);
    if (error) { alert('Error: ' + error.message); return; }
    const delta = mtsNuevos - Number(m.mts_impresos || 0);
    if (m.cod_tela && m.cliente && m.tela && delta > 0) {
      const { error: errorEgreso } = await supabase.from('egresos').insert([
        {
          fecha: new Date().toISOString().split('T')[0],
          cliente: m.cliente,
          tela: m.tela,
          id_hype: m.cod_tela,
          mts: delta,
          estado: 'A producción',
          observaciones: `Muestra · ${m.diseno || 'sin diseño'} · cargado desde Muestras`,
        },
      ]);
      if (errorEgreso) console.error('No se pudo descontar stock automáticamente:', errorEgreso);
    }
    cargar();
  }

  async function marcarTerminado(m: Muestra) {
    const hoy = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('muestras').update({ fecha_fin: hoy }).eq('id', m.id);
    if (error) { alert('Error: ' + error.message); return; }
    cargar();
  }

  async function revertirTerminado(m: Muestra) {
    if (!confirm('¿Revertir "terminado"? La muestra vuelve a quedar abierta y editable.')) return;
    const { error } = await supabase.from('muestras').update({ fecha_fin: null }).eq('id', m.id);
    if (error) { alert('Error: ' + error.message); return; }
    cargar();
  }

  async function borrar(id: number) {
    if (!confirm('¿Borrar esta muestra? No se puede deshacer.')) return;
    const { error } = await supabase.from('muestras').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else cargar();
  }

  // Se guarda solo desde la fila en blanco de abajo, al salir de la fila,
  // igual que en Reporte diario: no hay botón de "Agregar". Si ya se cargó
  // Mts Imp junto con Cliente + Tela en esa misma fila, descuenta el stock
  // de una: busca el id_hype (cod_tela) recién ahí y genera el egreso.
  async function guardarNuevaFila() {
    if (!nuevo.cliente && !nuevo.diseno) return;
    setGuardando(true);
    const mtsImpresos = parseFloat(nuevo.mts_impresos) || 0;
    const { data, error } = await supabase
      .from('muestras')
      .insert({
        fecha: nuevo.fecha,
        equipo: nuevo.equipo || null,
        cliente: nuevo.cliente || null,
        diseno: nuevo.diseno || null,
        mts_pedidos: parseFloat(nuevo.mts_pedidos) || 0,
        tela: nuevo.tela || null,
        mts_impresos: mtsImpresos,
        observaciones: nuevo.observaciones || null,
        imp_operario: nuevo.imp_operario || null,
        fija_operario: nuevo.fija_operario || null,
        comercial: nuevo.comercial || null,
        precio_mt: formatearPrecioMt(nuevo.precio_mt),
      })
      .select()
      .single();
    setGuardando(false);
    if (error) { alert('Error: ' + error.message); return; }
    if (data && nuevo.tela && nuevo.tela.trim().toUpperCase().includes('TCL PAQ')) {
      // Telas en paquete: no se buscan en Stock, van directo al carro.
      await supabase.from('muestras').update({ ubicacion: 'CARRO' }).eq('id', data.id);
    } else if (data && nuevo.cliente && nuevo.tela) {
      const disponibles = await stockPorCliente(nuevo.cliente);
      const telaNorm = nuevo.tela.trim().toLowerCase();
      const coincidencias = disponibles.filter(
        (s) => descripcionTela(s).trim().toLowerCase() === telaNorm || s.tela.trim().toLowerCase() === telaNorm
      );
      if (coincidencias.length > 0) {
        const mejor = coincidencias.sort((a, b) => b.disponible - a.disponible)[0];
        await supabase.from('muestras').update({ tela: descripcionTela(mejor), cod_tela: mejor.id_hype, ubicacion: mejor.ubicacion }).eq('id', data.id);
        if (mtsImpresos > 0) {
          const { error: errorEgreso } = await supabase.from('egresos').insert([
            {
              fecha: new Date().toISOString().split('T')[0],
              cliente: nuevo.cliente,
              tela: descripcionTela(mejor),
              id_hype: mejor.id_hype,
              mts: mtsImpresos,
              estado: 'A producción',
              observaciones: `Muestra · ${nuevo.diseno || 'sin diseño'} · cargado desde Muestras`,
            },
          ]);
          if (errorEgreso) console.error('No se pudo descontar stock automáticamente:', errorEgreso);
        }
      }
    }
    if (nuevo.cliente) await asegurarCliente(nuevo.cliente);
    setNuevo(muestraVacia());
    cargar();
  }

  if (cargando) return <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Cargando...</div>;

  const columnas = ['N', 'Fecha Pedido', 'Equipo', 'Cliente', 'Diseño', 'Mts Ped', 'Mts Imp', 'Observaciones', 'Tela', 'Ubic', 'Op Imp', 'Op Fij', 'Fecha fin', ...(esAdmin ? ['Borrar'] : []), 'Comercial', '$ x Mt'];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, textTransform: 'uppercase' }}>Muestras</div>
        <div style={{ fontSize: 13, color: '#888' }}>Carga manual, independiente de Producción. Agregá una fila nueva completando la última línea de la tabla.</div>
      </div>
      <style>{`
        .vm-grid th, .vm-grid td { border: 1px solid #ddd !important; text-align: center !important; }
      `}</style>
      <datalist id="clientes-muestras">
        {clientesStock.map((c) => <option key={c.cod} value={c.nombre} />)}
      </datalist>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="vm-grid" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {columnas.map((h) => (
                  <th key={h} style={{ ...th, textTransform: 'uppercase', background: '#e85d2f', color: '#fff', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {muestras.length === 0 && (
                <tr><td colSpan={columnas.length} style={{ ...td, textAlign: 'center', color: '#888' }}>Sin muestras cargadas</td></tr>
              )}
              {filasOrdenadas.map((m, idx) => {
                const terminado = !!m.fecha_fin;
                const noImprimio = m.imp_operario === 'NO';
                const impresoCompleto = !noImprimio && !!m.imp_operario && Number(m.mts_impresos) > 0;
                // Cuando además ya se fijó (Op Fij cargado), el verde pasa a
                // un tono más oscuro — se ve de un vistazo qué muestras ya
                // pasaron por fijación, no sólo por impresión.
                const fijadoCompleto = impresoCompleto && !!m.fija_operario;
                // Si no se pudo imprimir, el rojo pinta toda la fila (no solo
                // hasta Op Imp como en Producción) — acá no hay columnas de
                // entrega después que necesiten quedar sin pintar.
                const bgCelda = terminado || noImprimio ? {} : fijadoCompleto ? { background: '#bfe0b3' } : impresoCompleto ? { background: '#e6f4e1' } : {};
                return (
                  <tr key={m.id} style={terminado ? { background: '#8fce8a' } : noImprimio ? { background: '#fde8e8' } : undefined}>
                    <td style={{ ...td, color: '#888', ...bgCelda }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        {idx + 1}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <button onClick={() => moverFila(m.id, -1)} title="Subir" style={{ border: 'none', background: '#eee', borderRadius: 3, cursor: 'pointer', fontSize: 8, lineHeight: '10px', padding: '1px 3px' }}>▲</button>
                          <button onClick={() => moverFila(m.id, 1)} title="Bajar" style={{ border: 'none', background: '#eee', borderRadius: 3, cursor: 'pointer', fontSize: 8, lineHeight: '10px', padding: '1px 3px' }}>▼</button>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...td, minWidth: 140, ...bgCelda }}>
                      <input type="date" defaultValue={m.fecha} onBlur={(e) => actualizar(m.id, 'fecha', e.target.value)} style={{ ...selSm, width: '100%', minWidth: 130 }} />
                    </td>
                    <td style={{ ...td, width: 100, ...bgCelda }}>
                      <select value={m.equipo || ''} onChange={(e) => actualizar(m.id, 'equipo', e.target.value || null)} style={{ ...selSm, textTransform: 'uppercase', color: colorEquipo(m.equipo), fontWeight: colorEquipo(m.equipo) ? 700 : undefined }}>
                        <option value="">—</option>{EQUIPOS.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
                      </select>
                    </td>
                    <td style={{ ...td, minWidth: 170, ...bgCelda }}>
                      <input
                        defaultValue={m.cliente || ''}
                        onBlur={(e) => { actualizar(m.id, 'cliente', e.target.value || null); asegurarCliente(e.target.value); }}
                        list="clientes-muestras"
                        style={{ ...selSm, width: '100%', minWidth: 160 }}
                      />
                    </td>
                    <td style={{ ...td, minWidth: 170, ...bgCelda }}>
                      <input defaultValue={m.diseno || ''} onBlur={(e) => actualizar(m.id, 'diseno', e.target.value || null)} style={{ ...selSm, width: '100%', minWidth: 160 }} />
                    </td>
                    <td style={{ ...td, ...bgCelda }}>
                      <input type="number" defaultValue={m.mts_pedidos ?? ''} onBlur={(e) => actualizar(m.id, 'mts_pedidos', parseFloat(e.target.value) || 0)} style={{ ...selSm, width: 60 }} />
                    </td>
                    <td style={{ ...td, ...bgCelda }} title={m.motivo_no_impreso || undefined}>
                      {m.imp_operario === 'NO' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <span style={{ fontSize: 10, color: '#c00', fontWeight: 700 }}>NO IMPRESO</span>
                          <button onClick={() => revertirNoImpreso(m)} style={{ ...btn, padding: '1px 6px', fontSize: 9, color: '#c00', borderColor: '#c00' }}>revertir</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <input type="number" defaultValue={m.mts_impresos} onBlur={(e) => actualizarMtsImpresos(m, e.target.value)} style={{ ...selSm, width: 50 }} />
                          <button onClick={() => marcarNoImpreso(m)} title="No se pudo imprimir" style={{ ...btn, padding: '2px 5px', fontSize: 9, color: '#c00', borderColor: '#c00' }}>NO</button>
                        </div>
                      )}
                    </td>
                    <td style={{ ...td, minWidth: 260, whiteSpace: 'normal', ...bgCelda }}>
                      <textarea
                        defaultValue={m.observaciones || ''}
                        onBlur={(e) => actualizar(m.id, 'observaciones', e.target.value || null)}
                        rows={2}
                        style={{ ...selSm, width: '100%', minWidth: 250, resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </td>
                    <td style={{ ...td, minWidth: 190, ...bgCelda }}>
                      <input
                        defaultValue={m.tela || ''}
                        onBlur={(e) => { actualizar(m.id, 'tela', e.target.value || null); buscarCodTela(m, e.target.value); }}
                        list={`telas-stock-${m.id}`}
                        placeholder="Tela"
                        style={{ ...selSm, width: '100%', minWidth: 180 }}
                      />
                      <datalist id={`telas-stock-${m.id}`}>
                        {(stockPorClienteCache[m.cliente || ''] || []).map((s) => (
                          <option key={s.id_hype} value={descripcionTela(s)} />
                        ))}
                      </datalist>
                    </td>
                    <td style={{ ...td, width: 70, fontFamily: 'monospace', color: '#000', fontWeight: 700, fontSize: 12, ...bgCelda }}>{m.ubicacion || '—'}</td>
                    <td style={{ ...td, width: 90, ...bgCelda }}>
                      {m.imp_operario === 'NO' ? (
                        <span style={{ fontSize: 11, color: '#c00' }}>—</span>
                      ) : (
                        <select
                          value={m.imp_operario || ''}
                          onChange={(e) => actualizarImpOperario(m, e.target.value)}
                          disabled={Number(m.mts_impresos || 0) <= 0}
                          title={Number(m.mts_impresos || 0) <= 0 ? 'Primero hay que cargar Mts Imp' : undefined}
                          style={{ ...selSm, width: 85 }}
                        >
                          <option value="">—</option>
                          {OPERARIOS_IMPRESION.map((op) => <option key={op} value={op}>{op}</option>)}
                        </select>
                      )}
                    </td>
                    <td style={{ ...td, ...bgCelda }} title={m.imp_operario === 'NO' ? 'No se puede fijar: no se imprimió' : undefined}>
                      {m.imp_operario === 'NO' ? (
                        <span style={{ fontSize: 11, color: '#c00' }}>—</span>
                      ) : (
                        <select value={m.fija_operario || ''} onChange={(e) => actualizar(m.id, 'fija_operario', e.target.value || null)} disabled={!m.imp_operario} style={selSm}>
                          <option value="">—</option>{OPERARIOS_FIJACION.map((op) => <option key={op} value={op}>{op}</option>)}
                        </select>
                      )}
                    </td>
                    <td style={{ ...td, ...bgCelda }}>
                      {m.fecha_fin ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <span>{formatFecha(m.fecha_fin)}</span>
                          <button onClick={() => revertirTerminado(m)} style={{ ...btn, padding: '1px 6px', fontSize: 9, color: '#c00', borderColor: '#c00' }}>revertir</button>
                        </div>
                      ) : (
                        <button onClick={() => marcarTerminado(m)} disabled={!m.fija_operario} title={!m.fija_operario ? 'Primero hay que cargar Op Fij' : 'Marcar como terminado hoy'} style={{ ...btn, padding: '2px 6px', fontSize: 10 }}>
                          ✓ Marcar
                        </button>
                      )}
                    </td>
                    {esAdmin && (
                      <td style={td}>
                        <button onClick={() => borrar(m.id)} style={{ ...btn, padding: '4px 8px', fontSize: 11, color: '#c00', borderColor: '#c00' }}>✕ Borrar</button>
                      </td>
                    )}
                    <td style={td}>
                      <select
                        value={m.comercial || ''}
                        onChange={(e) => actualizar(m.id, 'comercial', e.target.value || null)}
                        disabled={!puedeComercial}
                        title={!puedeComercial ? 'Sólo lo completa Comercial' : undefined}
                        style={selSm}
                      >
                        <option value="">—</option>
                        {RESPONSABLES_COMERCIAL.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        <span style={{ fontWeight: 700 }}>$</span>
                        <input
                          defaultValue={(m.precio_mt || '').replace(/\D/g, '')}
                          onBlur={(e) => actualizar(m.id, 'precio_mt', formatearPrecioMt(e.target.value))}
                          placeholder="00000"
                          style={{ ...selSm, width: 55 }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr
                style={{ background: '#fff8ec' }}
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) guardarNuevaFila(); }}
              >
                <td style={{ ...td, color: '#bbb', fontSize: 11 }}>{guardando ? '…' : 'Nueva'}</td>
                <td style={{ ...td, minWidth: 140 }}>
                  <input type="date" value={nuevo.fecha} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} style={{ ...selSm, width: '100%', minWidth: 130 }} />
                </td>
                <td style={{ ...td, width: 100 }}>
                  <select value={nuevo.equipo} onChange={(e) => setNuevo({ ...nuevo, equipo: e.target.value })} style={{ ...selSm, textTransform: 'uppercase', color: colorEquipo(nuevo.equipo), fontWeight: colorEquipo(nuevo.equipo) ? 700 : undefined }}>
                    <option value="">—</option>{EQUIPOS.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
                  </select>
                </td>
                <td style={{ ...td, minWidth: 170 }}>
                  <input placeholder="Cliente" value={nuevo.cliente} onChange={(e) => setNuevo({ ...nuevo, cliente: e.target.value })} list="clientes-muestras" style={{ ...selSm, width: '100%', minWidth: 160 }} />
                </td>
                <td style={{ ...td, minWidth: 170 }}>
                  <input placeholder="Diseño" value={nuevo.diseno} onChange={(e) => setNuevo({ ...nuevo, diseno: e.target.value })} style={{ ...selSm, width: '100%', minWidth: 160 }} />
                </td>
                <td style={td}>
                  <input type="number" placeholder="Mts" value={nuevo.mts_pedidos} onChange={(e) => setNuevo({ ...nuevo, mts_pedidos: e.target.value })} style={{ ...selSm, width: 60 }} />
                </td>
                <td style={td}>
                  <input type="number" placeholder="Mts" value={nuevo.mts_impresos} onChange={(e) => setNuevo({ ...nuevo, mts_impresos: e.target.value })} style={{ ...selSm, width: 60 }} />
                </td>
                <td style={{ ...td, minWidth: 260 }}>
                  <textarea
                    placeholder="Observaciones"
                    rows={2}
                    value={nuevo.observaciones}
                    onChange={(e) => setNuevo({ ...nuevo, observaciones: e.target.value })}
                    style={{ ...selSm, width: '100%', minWidth: 250, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </td>
                <td style={{ ...td, minWidth: 190 }}>
                  <input
                    placeholder="Tela"
                    value={nuevo.tela}
                    onChange={(e) => setNuevo({ ...nuevo, tela: e.target.value })}
                    list="telas-stock-nueva"
                    style={{ ...selSm, width: '100%', minWidth: 180 }}
                  />
                  <datalist id="telas-stock-nueva">
                    {(stockPorClienteCache[nuevo.cliente] || []).map((s) => (
                      <option key={s.id_hype} value={descripcionTela(s)} />
                    ))}
                  </datalist>
                </td>
                <td style={td}>—</td>
                <td style={{ ...td, width: 90 }}>
                  <select
                    value={nuevo.imp_operario}
                    onChange={(e) => setNuevo({ ...nuevo, imp_operario: e.target.value })}
                    disabled={!(parseFloat(nuevo.mts_impresos) > 0)}
                    title={!(parseFloat(nuevo.mts_impresos) > 0) ? 'Primero hay que cargar Mts Imp' : undefined}
                    style={{ ...selSm, width: 85 }}
                  >
                    <option value="">—</option>{OPERARIOS_IMPRESION.map((op) => <option key={op} value={op}>{op}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <select value={nuevo.fija_operario} onChange={(e) => setNuevo({ ...nuevo, fija_operario: e.target.value })} style={selSm}>
                    <option value="">—</option>{OPERARIOS_FIJACION.map((op) => <option key={op} value={op}>{op}</option>)}
                  </select>
                </td>
                <td style={td}>—</td>
                {esAdmin && <td style={td}></td>}
                <td style={td}>
                  <select
                    value={nuevo.comercial}
                    onChange={(e) => setNuevo({ ...nuevo, comercial: e.target.value })}
                    disabled={!puedeComercial}
                    title={!puedeComercial ? 'Sólo lo completa Comercial' : undefined}
                    style={selSm}
                  >
                    <option value="">—</option>
                    {RESPONSABLES_COMERCIAL.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <span style={{ fontWeight: 700 }}>$</span>
                    <input
                      value={nuevo.precio_mt}
                      onChange={(e) => setNuevo({ ...nuevo, precio_mt: e.target.value.replace(/\D/g, '') })}
                      placeholder="00000"
                      style={{ ...selSm, width: 55 }}
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reporte diario: control de mts impresos por rollo y por turno,
// un módulo idéntico para cada equipo (Monalisa 32 / Monalisa 8).
// ---------------------------------------------------------------------------
// Equipos que tiene el Reporte diario: Monalisa 32/8 (impresión) son los
// mismos equipos de Producción; Cibitex (preparación/fijado) es propio
// de este reporte y no existe como equipo en ordenes_directa.
const EQUIPOS_REPORTE = [...EQUIPOS, 'Cibitex'];

function PanelReporteDiario({ ordenes, rol }: { ordenes: OrdenDirecta[]; rol: string }) {
  const [equipoActivo, setEquipoActivo] = useState<string>(EQUIPOS_REPORTE[0]);

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', color: '#e85d2f', marginBottom: 4 }}>
        Reporte diario
      </div>
      <div style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>
        Control de mts impresos por rollo y por turno, un módulo por equipo.
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {EQUIPOS_REPORTE.map((eq) => (
          <button
            key={eq}
            onClick={() => setEquipoActivo(eq)}
            style={{
              ...btn,
              background: equipoActivo === eq ? '#1a1a2e' : '#fff',
              color: equipoActivo === eq ? (colorEquipo(eq) || '#fff') : '#1a1a2e',
              border: '1px solid #1a1a2e',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {eq}
          </button>
        ))}
      </div>
      {equipoActivo === 'Cibitex' ? (
        <TablaCibitex ordenes={ordenes} rol={rol} />
      ) : (
        <TablaRollos equipo={equipoActivo} ordenes={ordenes} rol={rol} />
      )}
    </div>
  );
}

function filaRolloVacia() {
  return {
    fecha: new Date().toISOString().split('T')[0],
    turno: '',
    nro_ot: '',
    cliente: '',
    diseno: '',
    mts_imp_rollo: '',
    rollo_nro: '',
    tela: '',
    op_imp: '',
    novedades: '',
  };
}

function TablaRollos({ equipo, ordenes, rol }: { equipo: string; ordenes: OrdenDirecta[]; rol: string }) {
  const [rollos, setRollos] = useState<RolloReporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nuevo, setNuevo] = useState(filaRolloVacia());
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');

  // Solo los últimos 6 dígitos del nro_ot (más fácil de leer y escribir
  // que el correlativo completo de 12 dígitos).
  const nrosOt = Array.from(new Set(ordenes.map((o) => o.nro_ot.slice(-5)))).sort();

  // Filtro de búsqueda por Cliente, Nro OT, Diseño u Op Imp (coincidencia
  // parcial, sin importar mayúsculas/minúsculas). La fila en blanco de
  // carga siempre se ve, filtro aparte.
  const filtroNorm = filtro.trim().toLowerCase();
  const rollosFiltrados = filtroNorm
    ? rollos.filter((r) =>
        [(r.nro_ot || '').slice(-5), r.cliente, r.diseno, r.op_imp]
          .some((campo) => (campo || '').toLowerCase().includes(filtroNorm))
      )
    : rollos;

  async function cargar() {
    const { data, error } = await supabase
      .from('reporte_rollos')
      .select('*')
      .eq('equipo', equipo)
      .order('fecha', { ascending: true })
      .order('id', { ascending: true });
    if (!error) setRollos(data || []);
    setCargando(false);
  }

  useEffect(() => {
    setCargando(true);
    cargar();
  }, [equipo]);

  async function actualizar(id: number, campo: string, valor: any) {
    const { error } = await supabase.from('reporte_rollos').update({ [campo]: valor }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else cargar();
  }

  // El Cliente de esta fila viene solo de Producción: se busca la OT que
  // coincide (comparando los últimos 6 dígitos, que es lo que se ve y se
  // escribe acá) y se trae su cliente. No se escribe a mano.
  function buscarClientePorNroOt(nroOtCorto: string): string | null {
    if (!nroOtCorto) return null;
    const orden = ordenes.find((o) => o.nro_ot.slice(-5) === nroOtCorto.trim());
    return orden ? orden.cliente : null;
  }

  // El Diseño también viene solo de Producción: una misma OT puede tener
  // varios diseños, así que se listan todos los de esa OT en un
  // desplegable en vez de tipearlo a mano.
  function disenosPorNroOt(nroOtCorto: string): string[] {
    if (!nroOtCorto) return [];
    return Array.from(new Set(ordenes.filter((o) => o.nro_ot.slice(-5) === nroOtCorto.trim()).map((o) => o.diseno)));
  }

  // La Tela también viene de Producción: si ya se eligió un diseño se
  // acota a la tela de ese diseño puntual; si no, se listan todas las
  // telas de esa OT.
  function telasPorNroOt(nroOtCorto: string, diseno?: string): string[] {
    if (!nroOtCorto) return [];
    const candidatas = ordenes.filter((o) => o.nro_ot.slice(-5) === nroOtCorto.trim() && (!diseno || o.diseno === diseno));
    return Array.from(new Set(candidatas.map((o) => o.tela).filter(Boolean) as string[]));
  }

  // Igual que en Producción y Nuevo Pedido: al elegir/corregir la tela,
  // busca en Stock el id_hype de ese cliente + tela y lo completa solo.
  async function buscarCodTela(r: RolloReporte, telaTexto?: string) {
    const tela = (telaTexto ?? r.tela) || '';
    if (!r.cliente || !tela) return;
    const disponibles = await stockPorCliente(r.cliente);
    const coincidencias = disponibles.filter((s) => s.tela.trim().toLowerCase() === tela.trim().toLowerCase());
    if (coincidencias.length === 0) return;
    const mejor = coincidencias.sort((a, b) => b.disponible - a.disponible)[0];
    await actualizar(r.id, 'cod_tela', mejor.id_hype);
  }

  async function eliminar(id: number) {
    if (!confirm('¿Borrar este registro de rollo? No se puede deshacer.')) return;
    const { error } = await supabase.from('reporte_rollos').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else cargar();
  }

  // Se guarda solo, directamente desde la fila en blanco de la tabla: no
  // hay botón de "Agregar". Se dispara cuando el foco sale de la fila
  // (clic afuera o tab al final) y ya se eligió el turno (único campo
  // obligatorio). Si todavía no hay turno elegido, no hace nada — los
  // datos quedan en la fila hasta que lo completen.
  async function guardarNuevaFila() {
    if (!nuevo.turno) return;
    setGuardando(true);
    const { data, error } = await supabase
      .from('reporte_rollos')
      .insert({
        equipo,
        fecha: nuevo.fecha,
        turno: nuevo.turno,
        nro_ot: nuevo.nro_ot || null,
        cliente: nuevo.cliente || null,
        diseno: nuevo.diseno || null,
        mts_imp_rollo: parseFloat(nuevo.mts_imp_rollo) || 0,
        rollo_nro: nuevo.rollo_nro || null,
        tela: nuevo.tela || null,
        op_imp: nuevo.op_imp || null,
        novedades: nuevo.novedades || null,
      })
      .select()
      .single();
    setGuardando(false);
    if (error) { alert('Error: ' + error.message); return; }
    if (data && nuevo.cliente && nuevo.tela) await buscarCodTela(data as RolloReporte, nuevo.tela);
    setNuevo(filaRolloVacia());
    cargar();
  }

  const listaNrosOt = `nros-ot-${equipo}`;
  const esAdmin = rol.trim() === 'admin';

  // Columnas de impresión (naranja pastel — todo lo que completan los
  // operarios de impresión), y por último Borrar (solo admin). El
  // fijado/terminación ahora vive en su propia pestaña (Cibitex).
  const columnasImpresion = ['Fecha', 'Turno', 'Nro OT', 'Cliente', 'Diseño', 'Mts Imp x Rollo', 'Rollo Nro', 'Tela', 'Op Imp', 'Novedades cambio de turno'];
  const columnas = [...columnasImpresion, ...(esAdmin ? ['Borrar'] : [])];

  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por Cliente, Nro OT, Diseño u Op Imp..."
          style={{ ...inp, maxWidth: 360, textTransform: 'none' }}
        />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columnas.map((h) => (
                <th
                  key={h}
                  style={{
                    ...th,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: 12,
                    whiteSpace: 'normal',
                    lineHeight: 1.3,
                    ...(columnasImpresion.includes(h) ? { background: '#fbe0c8', color: '#000' } : {}),
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rollosFiltrados.map((r) => {
              // Fila completa: se cargaron todos los datos de esa impresión
              // (OT, diseño, tela, mts y operario). Rollo Nro y Novedades
              // quedan afuera a propósito: son opcionales.
              const filaCompleta = !!(r.nro_ot && r.diseno && r.tela && r.op_imp && Number(r.mts_imp_rollo) > 0);
              return (
              <tr key={r.id} style={filaCompleta ? { background: '#e6f4e1' } : undefined}>
                <td style={{ ...td, minWidth: 100 }}>
                  <input type="date" defaultValue={r.fecha} onBlur={(e) => actualizar(r.id, 'fecha', e.target.value)} style={{ ...selSm, width: '100%', minWidth: 95 }} />
                </td>
                <td style={td}>
                  <select defaultValue={r.turno} onChange={(e) => actualizar(r.id, 'turno', e.target.value)} style={selSm}>
                    {TURNOS_REPORTE.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td style={{ ...td, minWidth: 70 }}>
                  <input
                    list={listaNrosOt}
                    defaultValue={(r.nro_ot || '').slice(-5)}
                    onBlur={(e) => {
                      const valor = e.target.value;
                      actualizar(r.id, 'nro_ot', valor || null);
                      const cliente = buscarClientePorNroOt(valor);
                      if (cliente) actualizar(r.id, 'cliente', cliente);
                      const disenosOt = disenosPorNroOt(valor);
                      if (disenosOt.length === 1) actualizar(r.id, 'diseno', disenosOt[0]);
                    }}
                    style={{ ...selSm, width: '100%', minWidth: 62 }}
                  />
                </td>
                <td style={{ ...td, minWidth: 130 }}>
                  <input defaultValue={r.cliente || ''} readOnly disabled style={{ ...selSm, width: '100%', minWidth: 120, background: '#f0f0f0', color: '#666' }} />
                </td>
                <td style={{ ...td, minWidth: 130 }}>
                  <select defaultValue={r.diseno || ''} onChange={(e) => actualizar(r.id, 'diseno', e.target.value || null)} style={{ ...selSm, width: '100%', minWidth: 120 }}>
                    <option value="">—</option>
                    {disenosPorNroOt((r.nro_ot || '').slice(-5)).map((d) => <option key={d} value={d}>{d}</option>)}
                    {r.diseno && !disenosPorNroOt((r.nro_ot || '').slice(-5)).includes(r.diseno) && (
                      <option value={r.diseno}>{r.diseno} (ya no está en esa OT)</option>
                    )}
                  </select>
                </td>
                <td style={td}>
                  <input type="number" defaultValue={r.mts_imp_rollo ?? ''} onBlur={(e) => actualizar(r.id, 'mts_imp_rollo', parseFloat(e.target.value) || 0)} style={{ ...selSm, width: 80 }} />
                </td>
                <td style={td}>
                  <input defaultValue={r.rollo_nro || ''} onBlur={(e) => actualizar(r.id, 'rollo_nro', e.target.value || null)} style={{ ...selSm, width: 80 }} />
                </td>
                <td style={{ ...td, minWidth: 220 }}>
                  <select
                    defaultValue={r.tela || ''}
                    onChange={(e) => { actualizar(r.id, 'tela', e.target.value || null); buscarCodTela(r, e.target.value); }}
                    style={{ ...selSm, width: '100%', minWidth: 210 }}
                  >
                    <option value="">—</option>
                    {telasPorNroOt((r.nro_ot || '').slice(-5), r.diseno || undefined).map((t) => <option key={t} value={t}>{t}</option>)}
                    {r.tela && !telasPorNroOt((r.nro_ot || '').slice(-5), r.diseno || undefined).includes(r.tela) && (
                      <option value={r.tela}>{r.tela} (ya no está en esa OT/diseño)</option>
                    )}
                  </select>
                </td>
                <td style={td}>
                  <select defaultValue={r.op_imp || ''} onChange={(e) => actualizar(r.id, 'op_imp', e.target.value || null)} style={selSm}>
                    <option value="">—</option>
                    {OPERARIOS_IMPRESION.map((op) => <option key={op} value={op}>{op}</option>)}
                  </select>
                </td>
                <td style={{ ...td, minWidth: 240, whiteSpace: 'normal', verticalAlign: 'top' }}>
                  <textarea
                    rows={2}
                    defaultValue={r.novedades || ''}
                    onBlur={(e) => actualizar(r.id, 'novedades', e.target.value || null)}
                    style={{ ...selSm, width: '100%', minWidth: 230, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </td>
                {esAdmin && (
                  <td style={td}>
                    <button onClick={() => eliminar(r.id)} style={{ ...btn, padding: '4px 8px', color: '#c0392b', borderColor: '#c0392b' }}>✕</button>
                  </td>
                )}
              </tr>
              );
            })}
            <tr
              style={{ background: '#fff8ec' }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) guardarNuevaFila();
              }}
            >
              <td style={{ ...td, minWidth: 100 }}>
                <input type="date" value={nuevo.fecha} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} style={{ ...selSm, width: '100%', minWidth: 95 }} />
              </td>
              <td style={td}>
                <select value={nuevo.turno} onChange={(e) => setNuevo({ ...nuevo, turno: e.target.value })} style={selSm}>
                  <option value="">—</option>
                  {TURNOS_REPORTE.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              <td style={{ ...td, minWidth: 70 }}>
                <input
                  list={listaNrosOt}
                  placeholder="Nro OT"
                  value={nuevo.nro_ot}
                  onChange={(e) => {
                    const valor = e.target.value;
                    const disenosOt = disenosPorNroOt(valor);
                    const disenoAuto = disenosOt.length === 1 ? disenosOt[0] : '';
                    const telasOt = telasPorNroOt(valor, disenoAuto || undefined);
                    setNuevo({
                      ...nuevo,
                      nro_ot: valor,
                      cliente: buscarClientePorNroOt(valor) || '',
                      diseno: disenoAuto,
                      tela: telasOt.length === 1 ? telasOt[0] : '',
                    });
                  }}
                  style={{ ...selSm, width: '100%', minWidth: 62 }}
                />
              </td>
              <td style={{ ...td, minWidth: 130 }}>
                <input placeholder="— (según Nro OT)" value={nuevo.cliente} readOnly disabled style={{ ...selSm, width: '100%', minWidth: 120, background: '#f0f0f0', color: '#666' }} />
              </td>
              <td style={{ ...td, minWidth: 130 }}>
                <select
                  value={nuevo.diseno}
                  onChange={(e) => {
                    const disenoNuevo = e.target.value;
                    const telasOt = telasPorNroOt(nuevo.nro_ot, disenoNuevo || undefined);
                    setNuevo({ ...nuevo, diseno: disenoNuevo, tela: telasOt.length === 1 ? telasOt[0] : '' });
                  }}
                  style={{ ...selSm, width: '100%', minWidth: 120 }}
                  disabled={!nuevo.nro_ot}
                >
                  <option value="">{nuevo.nro_ot ? '— (elegir diseño)' : '— (elegir Nro OT primero)'}</option>
                  {disenosPorNroOt(nuevo.nro_ot).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </td>
              <td style={td}>
                <input type="number" placeholder="Mts" value={nuevo.mts_imp_rollo} onChange={(e) => setNuevo({ ...nuevo, mts_imp_rollo: e.target.value })} style={{ ...selSm, width: 80 }} />
              </td>
              <td style={td}>
                <input placeholder="Rollo" value={nuevo.rollo_nro} onChange={(e) => setNuevo({ ...nuevo, rollo_nro: e.target.value })} style={{ ...selSm, width: 80 }} />
              </td>
              <td style={{ ...td, minWidth: 220 }}>
                <select
                  value={nuevo.tela}
                  onChange={(e) => setNuevo({ ...nuevo, tela: e.target.value })}
                  style={{ ...selSm, width: '100%', minWidth: 210 }}
                  disabled={!nuevo.nro_ot}
                >
                  <option value="">{nuevo.nro_ot ? '— (elegir tela)' : '— (elegir Nro OT primero)'}</option>
                  {telasPorNroOt(nuevo.nro_ot, nuevo.diseno || undefined).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              <td style={td}>
                <select value={nuevo.op_imp} onChange={(e) => setNuevo({ ...nuevo, op_imp: e.target.value })} style={selSm}>
                  <option value="">—</option>
                  {OPERARIOS_IMPRESION.map((op) => <option key={op} value={op}>{op}</option>)}
                </select>
              </td>
              <td style={{ ...td, minWidth: 240, whiteSpace: 'normal', verticalAlign: 'top' }}>
                <textarea
                  placeholder="Novedades"
                  rows={2}
                  value={nuevo.novedades}
                  onChange={(e) => setNuevo({ ...nuevo, novedades: e.target.value })}
                  style={{ ...selSm, width: '100%', minWidth: 230, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </td>
              {esAdmin && <td style={{ ...td, color: '#bbb', fontSize: 11 }}>{guardando ? 'Guardando…' : ''}</td>}
            </tr>
            {!cargando && rollos.length === 0 && (
              <tr><td colSpan={columnas.length} style={{ ...td, textAlign: 'center', color: '#888' }}>Sin registros todavía para {equipo}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <datalist id={listaNrosOt}>{nrosOt.map((n) => <option key={n} value={n} />)}</datalist>
    </div>
  );
}

function filaCibitexVacia() {
  return {
    fecha: new Date().toISOString().split('T')[0],
    turno: '',
    tipo_proceso: '',
    nro_ot: '',
    cliente: '',
    diseno: '',
    tela: '',
    mts_fij: '',
    nro_rollos_fij: '',
    op_fij: '',
  };
}

// Cibitex: equipo propio de preparación/fijado, separado de Monalisa
// 32/8 (que son de impresión). Nro OT/Cliente/Diseño se traen de
// Producción igual que en las tablas de impresión — salvo que, cuando
// el Tipo es "Preparación", no aplica un diseño puntual (la preparación
// se hace a nivel OT, antes de imprimir un diseño en particular).
function TablaCibitex({ ordenes, rol }: { ordenes: OrdenDirecta[]; rol: string }) {
  const [rollos, setRollos] = useState<RolloReporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nuevo, setNuevo] = useState(filaCibitexVacia());
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');
  const esAdmin = rol.trim() === 'admin';

  const nrosOt = Array.from(new Set(ordenes.map((o) => o.nro_ot.slice(-5)))).sort();

  // Filtro de búsqueda por Cliente, Nro OT, Diseño u Op Fij (coincidencia
  // parcial, sin importar mayúsculas/minúsculas). La fila en blanco de
  // carga siempre se ve, filtro aparte.
  const filtroNorm = filtro.trim().toLowerCase();
  const rollosFiltrados = filtroNorm
    ? rollos.filter((r) =>
        [(r.nro_ot || '').slice(-5), r.cliente, r.diseno, r.op_fij]
          .some((campo) => (campo || '').toLowerCase().includes(filtroNorm))
      )
    : rollos;

  // Los tipos "PREP Y ..." y "PLANCHADO" son a nivel OT, antes/sin
  // depender de un diseño en particular — para esos no aplica elegir
  // un diseño puntual.
  function esTipoPrep(tipo: string): boolean {
    return tipo.startsWith('PREP') || tipo === 'PLANCHADO';
  }

  function buscarClientePorNroOt(nroOtCorto: string): string | null {
    if (!nroOtCorto) return null;
    const orden = ordenes.find((o) => o.nro_ot.slice(-5) === nroOtCorto.trim());
    return orden ? orden.cliente : null;
  }

  function disenosPorNroOt(nroOtCorto: string): string[] {
    if (!nroOtCorto) return [];
    return Array.from(new Set(ordenes.filter((o) => o.nro_ot.slice(-5) === nroOtCorto.trim()).map((o) => o.diseno)));
  }

  function telasPorNroOt(nroOtCorto: string, diseno?: string): string[] {
    if (!nroOtCorto) return [];
    const candidatas = ordenes.filter((o) => o.nro_ot.slice(-5) === nroOtCorto.trim() && (!diseno || o.diseno === diseno));
    return Array.from(new Set(candidatas.map((o) => o.tela).filter(Boolean) as string[]));
  }

  async function cargar() {
    const { data, error } = await supabase
      .from('reporte_rollos')
      .select('*')
      .eq('equipo', 'Cibitex')
      .order('fecha', { ascending: true })
      .order('id', { ascending: true });
    if (!error) setRollos(data || []);
    setCargando(false);
  }

  useEffect(() => {
    setCargando(true);
    cargar();
  }, []);

  async function actualizar(id: number, campo: string, valor: any) {
    const { error } = await supabase.from('reporte_rollos').update({ [campo]: valor }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else cargar();
  }

  async function buscarCodTela(r: RolloReporte, telaTexto?: string) {
    const tela = (telaTexto ?? r.tela) || '';
    if (!r.cliente || !tela) return;
    const disponibles = await stockPorCliente(r.cliente);
    const coincidencias = disponibles.filter((s) => s.tela.trim().toLowerCase() === tela.trim().toLowerCase());
    if (coincidencias.length === 0) return;
    const mejor = coincidencias.sort((a, b) => b.disponible - a.disponible)[0];
    await actualizar(r.id, 'cod_tela', mejor.id_hype);
  }

  async function eliminar(id: number) {
    if (!confirm('¿Borrar este registro? No se puede deshacer.')) return;
    const { error } = await supabase.from('reporte_rollos').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else cargar();
  }

  // Igual que en las tablas de Monalisa: se guarda solo al salir de la
  // fila en blanco, sin botón, en cuanto se eligió el turno.
  async function guardarNuevaFila() {
    if (!nuevo.turno) return;
    setGuardando(true);
    const { data, error } = await supabase
      .from('reporte_rollos')
      .insert({
        equipo: 'Cibitex',
        fecha: nuevo.fecha,
        turno: nuevo.turno,
        tipo_proceso: nuevo.tipo_proceso || null,
        nro_ot: nuevo.nro_ot || null,
        cliente: nuevo.cliente || null,
        diseno: esTipoPrep(nuevo.tipo_proceso) ? null : nuevo.diseno || null,
        tela: nuevo.tela || null,
        mts_fij: nuevo.mts_fij ? parseFloat(nuevo.mts_fij) || 0 : null,
        nro_rollos_fij: nuevo.nro_rollos_fij || null,
        op_fij: nuevo.op_fij || null,
      })
      .select()
      .single();
    setGuardando(false);
    if (error) { alert('Error: ' + error.message); return; }
    if (data && nuevo.cliente && nuevo.tela) await buscarCodTela(data as RolloReporte, nuevo.tela);
    setNuevo(filaCibitexVacia());
    cargar();
  }

  const listaNrosOt = 'nros-ot-cibitex';
  const columnas = ['Fecha', 'Turno Term', 'Tipo', 'Nro OT', 'Cliente', 'Diseño', 'Tela', 'Mts', 'Nro de Rollos', 'Op Fij', ...(esAdmin ? ['Borrar'] : [])];

  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por Cliente, Nro OT, Diseño u Op Fij..."
          style={{ ...inp, maxWidth: 360, textTransform: 'none' }}
        />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columnas.map((h) => (
                <th
                  key={h}
                  style={{
                    ...th,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: 12,
                    whiteSpace: 'normal',
                    lineHeight: 1.3,
                    ...(h !== 'Borrar' ? { background: '#e6dcf7', color: '#000' } : {}),
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rollosFiltrados.map((r) => {
              // Fila completa: se cargó todo lo necesario para ese proceso
              // (tipo, OT, tela, mts, nro de rollos y operario). El diseño
              // no se pide si el tipo es "PREP..." (no aplica).
              const filaCompleta = !!(
                r.tipo_proceso &&
                r.nro_ot &&
                r.tela &&
                r.mts_fij !== null && r.mts_fij !== undefined &&
                r.nro_rollos_fij &&
                r.op_fij &&
                (esTipoPrep(r.tipo_proceso) || r.diseno)
              );
              return (
              <tr key={r.id} style={filaCompleta ? { background: '#e6f4e1' } : undefined}>
                <td style={{ ...td, minWidth: 100 }}>
                  <input type="date" defaultValue={r.fecha} onBlur={(e) => actualizar(r.id, 'fecha', e.target.value)} style={{ ...selSm, width: '100%', minWidth: 95 }} />
                </td>
                <td style={td}>
                  <select defaultValue={r.turno || ''} onChange={(e) => actualizar(r.id, 'turno', e.target.value || null)} style={selSm}>
                    <option value="">—</option>
                    {TURNOS_REPORTE.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td style={{ ...td, minWidth: 190 }}>
                  <select
                    defaultValue={r.tipo_proceso || ''}
                    onChange={(e) => {
                      actualizar(r.id, 'tipo_proceso', e.target.value || null);
                      if (esTipoPrep(e.target.value)) actualizar(r.id, 'diseno', null);
                    }}
                    style={{ ...selSm, width: '100%', minWidth: 180 }}
                  >
                    <option value="">—</option>
                    {TIPOS_PROCESO_CIBITEX.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td style={{ ...td, minWidth: 70 }}>
                  <input
                    list={listaNrosOt}
                    defaultValue={(r.nro_ot || '').slice(-5)}
                    onBlur={(e) => {
                      const valor = e.target.value;
                      actualizar(r.id, 'nro_ot', valor || null);
                      const cliente = buscarClientePorNroOt(valor);
                      if (cliente) actualizar(r.id, 'cliente', cliente);
                      if (!esTipoPrep(r.tipo_proceso || '')) {
                        const disenosOt = disenosPorNroOt(valor);
                        if (disenosOt.length === 1) actualizar(r.id, 'diseno', disenosOt[0]);
                      }
                    }}
                    style={{ ...selSm, width: '100%', minWidth: 62 }}
                  />
                </td>
                <td style={{ ...td, minWidth: 130 }}>
                  <input defaultValue={r.cliente || ''} readOnly disabled style={{ ...selSm, width: '100%', minWidth: 120, background: '#f0f0f0', color: '#666' }} />
                </td>
                <td style={{ ...td, minWidth: 200 }}>
                  <select
                    defaultValue={r.diseno || ''}
                    onChange={(e) => actualizar(r.id, 'diseno', e.target.value || null)}
                    style={{ ...selSm, width: '100%', minWidth: 190 }}
                    disabled={esTipoPrep(r.tipo_proceso || '')}
                  >
                    <option value="">{esTipoPrep(r.tipo_proceso || '') ? '— (no aplica)' : '—'}</option>
                    {disenosPorNroOt((r.nro_ot || '').slice(-5)).map((d) => <option key={d} value={d}>{d}</option>)}
                    {r.diseno && !disenosPorNroOt((r.nro_ot || '').slice(-5)).includes(r.diseno) && (
                      <option value={r.diseno}>{r.diseno} (ya no está en esa OT)</option>
                    )}
                  </select>
                </td>
                <td style={{ ...td, minWidth: 220 }}>
                  <select
                    defaultValue={r.tela || ''}
                    onChange={(e) => { actualizar(r.id, 'tela', e.target.value || null); buscarCodTela(r, e.target.value); }}
                    style={{ ...selSm, width: '100%', minWidth: 210 }}
                  >
                    <option value="">—</option>
                    {telasPorNroOt((r.nro_ot || '').slice(-5), esTipoPrep(r.tipo_proceso || '') ? undefined : (r.diseno || undefined)).map((t) => <option key={t} value={t}>{t}</option>)}
                    {r.tela && !telasPorNroOt((r.nro_ot || '').slice(-5), esTipoPrep(r.tipo_proceso || '') ? undefined : (r.diseno || undefined)).includes(r.tela) && (
                      <option value={r.tela}>{r.tela} (ya no está en esa OT/diseño)</option>
                    )}
                  </select>
                </td>
                <td style={td}>
                  <input type="number" defaultValue={r.mts_fij ?? ''} onBlur={(e) => actualizar(r.id, 'mts_fij', e.target.value === '' ? null : parseFloat(e.target.value) || 0)} style={{ ...selSm, width: 60 }} />
                </td>
                <td style={td}>
                  <input defaultValue={r.nro_rollos_fij || ''} onBlur={(e) => actualizar(r.id, 'nro_rollos_fij', e.target.value || null)} style={{ ...selSm, width: 50 }} />
                </td>
                <td style={td}>
                  <select defaultValue={r.op_fij || ''} onChange={(e) => actualizar(r.id, 'op_fij', e.target.value || null)} style={selSm}>
                    <option value="">—</option>
                    {OPERARIOS_FIJACION.map((op) => <option key={op} value={op}>{op}</option>)}
                  </select>
                </td>
                {esAdmin && (
                  <td style={td}>
                    <button onClick={() => eliminar(r.id)} style={{ ...btn, padding: '4px 8px', color: '#c0392b', borderColor: '#c0392b' }}>✕</button>
                  </td>
                )}
              </tr>
              );
            })}
            <tr
              style={{ background: '#fff8ec' }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) guardarNuevaFila();
              }}
            >
              <td style={{ ...td, minWidth: 100 }}>
                <input type="date" value={nuevo.fecha} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} style={{ ...selSm, width: '100%', minWidth: 95 }} />
              </td>
              <td style={td}>
                <select value={nuevo.turno} onChange={(e) => setNuevo({ ...nuevo, turno: e.target.value })} style={selSm}>
                  <option value="">—</option>
                  {TURNOS_REPORTE.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              <td style={{ ...td, minWidth: 190 }}>
                <select
                  value={nuevo.tipo_proceso}
                  onChange={(e) => {
                    const tipoNuevo = e.target.value;
                    const disenoNuevo = esTipoPrep(tipoNuevo) ? '' : nuevo.diseno;
                    const telasOt = telasPorNroOt(nuevo.nro_ot, disenoNuevo || undefined);
                    setNuevo({
                      ...nuevo,
                      tipo_proceso: tipoNuevo,
                      diseno: disenoNuevo,
                      tela: telasOt.includes(nuevo.tela) ? nuevo.tela : (telasOt.length === 1 ? telasOt[0] : ''),
                    });
                  }}
                  style={{ ...selSm, width: '100%', minWidth: 180 }}
                >
                  <option value="">—</option>
                  {TIPOS_PROCESO_CIBITEX.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              <td style={{ ...td, minWidth: 70 }}>
                <input
                  list={listaNrosOt}
                  placeholder="Nro OT"
                  value={nuevo.nro_ot}
                  onChange={(e) => {
                    const valor = e.target.value;
                    const disenosOt = disenosPorNroOt(valor);
                    const disenoAuto = esTipoPrep(nuevo.tipo_proceso) ? '' : (disenosOt.length === 1 ? disenosOt[0] : '');
                    const telasOt = telasPorNroOt(valor, disenoAuto || undefined);
                    setNuevo({
                      ...nuevo,
                      nro_ot: valor,
                      cliente: buscarClientePorNroOt(valor) || '',
                      diseno: disenoAuto,
                      tela: telasOt.length === 1 ? telasOt[0] : '',
                    });
                  }}
                  style={{ ...selSm, width: '100%', minWidth: 62 }}
                />
              </td>
              <td style={{ ...td, minWidth: 130 }}>
                <input placeholder="— (según Nro OT)" value={nuevo.cliente} readOnly disabled style={{ ...selSm, width: '100%', minWidth: 120, background: '#f0f0f0', color: '#666' }} />
              </td>
              <td style={{ ...td, minWidth: 200 }}>
                <select
                  value={nuevo.diseno}
                  onChange={(e) => {
                    const disenoNuevo = e.target.value;
                    const telasOt = telasPorNroOt(nuevo.nro_ot, disenoNuevo || undefined);
                    setNuevo({ ...nuevo, diseno: disenoNuevo, tela: telasOt.length === 1 ? telasOt[0] : '' });
                  }}
                  style={{ ...selSm, width: '100%', minWidth: 190 }}
                  disabled={!nuevo.nro_ot || esTipoPrep(nuevo.tipo_proceso)}
                >
                  <option value="">
                    {esTipoPrep(nuevo.tipo_proceso) ? '— (no aplica)' : nuevo.nro_ot ? '— (elegir diseño)' : '— (elegir Nro OT primero)'}
                  </option>
                  {!esTipoPrep(nuevo.tipo_proceso) && disenosPorNroOt(nuevo.nro_ot).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </td>
              <td style={{ ...td, minWidth: 220 }}>
                <select
                  value={nuevo.tela}
                  onChange={(e) => setNuevo({ ...nuevo, tela: e.target.value })}
                  style={{ ...selSm, width: '100%', minWidth: 210 }}
                  disabled={!nuevo.nro_ot}
                >
                  <option value="">{nuevo.nro_ot ? '— (elegir tela)' : '— (elegir Nro OT primero)'}</option>
                  {telasPorNroOt(nuevo.nro_ot, esTipoPrep(nuevo.tipo_proceso) ? undefined : (nuevo.diseno || undefined)).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              <td style={td}>
                <input type="number" placeholder="Mts" value={nuevo.mts_fij} onChange={(e) => setNuevo({ ...nuevo, mts_fij: e.target.value })} style={{ ...selSm, width: 60 }} />
              </td>
              <td style={td}>
                <input placeholder="Rollos" value={nuevo.nro_rollos_fij} onChange={(e) => setNuevo({ ...nuevo, nro_rollos_fij: e.target.value })} style={{ ...selSm, width: 50 }} />
              </td>
              <td style={td}>
                <select value={nuevo.op_fij} onChange={(e) => setNuevo({ ...nuevo, op_fij: e.target.value })} style={selSm}>
                  <option value="">—</option>
                  {OPERARIOS_FIJACION.map((op) => <option key={op} value={op}>{op}</option>)}
                </select>
              </td>
              {esAdmin && <td style={{ ...td, color: '#bbb', fontSize: 11 }}>{guardando ? 'Guardando…' : ''}</td>}
            </tr>
            {!cargando && rollos.length === 0 && (
              <tr><td colSpan={columnas.length} style={{ ...td, textAlign: 'center', color: '#888' }}>Sin registros todavía para Cibitex</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <datalist id={listaNrosOt}>{nrosOt.map((n) => <option key={n} value={n} />)}</datalist>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Historial de eventos
// ---------------------------------------------------------------------------
// Forma común para poder mostrar en una sola tabla los eventos de los tres
// módulos (Producción, Muestras y Reporte diario), que viven en tablas
// distintas de Supabase.
type FilaHistorial = {
  key: string;
  fecha: string;
  modulo: 'Producción' | 'Muestras' | 'Reporte diario';
  referencia: string;
  cliente: string;
  diseno: string;
  evento: string;
  detalle: string | null;
  usuario: string | null;
};

const MODULOS_HISTORIAL = ['Producción', 'Muestras', 'Reporte diario'] as const;

function Historial({
  eventos,
  eventosMuestras,
  eventosReporte,
  ordenes,
}: {
  eventos: EventoDirecta[];
  eventosMuestras: EventoMuestra[];
  eventosReporte: EventoRollo[];
  ordenes: OrdenDirecta[];
}) {
  const mapOrden = new Map(ordenes.map((o) => [o.id, o]));
  const [search, setSearch] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');

  const filas: FilaHistorial[] = [
    ...eventos.map((e): FilaHistorial => {
      const o = mapOrden.get(e.orden_id);
      return {
        key: `p-${e.id}`,
        fecha: e.created_at,
        modulo: 'Producción',
        referencia: o?.nro_ot || `#${e.orden_id}`,
        cliente: o?.cliente || '—',
        diseno: o?.diseno || '—',
        evento: e.evento,
        detalle: e.detalle,
        usuario: e.usuario,
      };
    }),
    ...eventosMuestras.map((e): FilaHistorial => ({
      key: `m-${e.id}`,
      fecha: e.created_at,
      modulo: 'Muestras',
      referencia: `#${e.muestra_id}`,
      cliente: e.cliente || '—',
      diseno: e.diseno || '—',
      evento: e.evento,
      detalle: e.detalle,
      usuario: e.usuario,
    })),
    ...eventosReporte.map((e): FilaHistorial => ({
      key: `r-${e.id}`,
      fecha: e.created_at,
      modulo: 'Reporte diario',
      referencia: e.nro_ot ? e.nro_ot.slice(-5) : `#${e.rollo_id}`,
      cliente: e.cliente || '—',
      diseno: e.diseno || '—',
      evento: e.evento,
      detalle: e.detalle,
      usuario: e.usuario,
    })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const filasFiltradas = filas.filter((f) => {
    if (filtroModulo && f.modulo !== filtroModulo) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.cliente.toLowerCase().includes(q) ||
      f.diseno.toLowerCase().includes(q) ||
      f.referencia.toLowerCase().includes(q) ||
      (f.usuario || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Historial</div>
          <div style={{ fontSize: 13, color: '#888' }}>Cambios de Producción, Muestras y Reporte diario, y quién los hizo</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filtroModulo} onChange={(e) => setFiltroModulo(e.target.value)} style={{ ...inp, maxWidth: 170 }}>
            <option value="">Todos los módulos</option>
            {MODULOS_HISTORIAL.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input placeholder="Buscar por referencia, cliente, diseño o usuario..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inp, maxWidth: 280 }} />
        </div>
      </div>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Fecha', 'Módulo', 'Referencia', 'Cliente', 'Diseño', 'Evento', 'Detalle', 'Usuario'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filasFiltradas.slice(0, 300).map((f) => (
                <tr key={f.key}>
                  <td style={td}>{new Date(f.fecha).toLocaleString()}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{f.modulo}</td>
                  <td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f' }}>{f.referencia}</td>
                  <td style={td}>{f.cliente}</td>
                  <td style={td}>{f.diseno}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{f.evento}</td>
                  <td style={td}>{f.detalle || '—'}</td>
                  <td style={td}>{f.usuario || '—'}</td>
                </tr>
              ))}
              {filasFiltradas.length === 0 && (
                <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: '#888' }}>Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
