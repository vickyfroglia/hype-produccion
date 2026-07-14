'use client';
import { useEffect, useState } from 'react';
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
  TELAS_HYPE_TH,
  faltaParaProducir,
  estaAtrasada,
  calcularPrioridad,
  formatFecha,
} from '../lib/types';

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
        cargarTodo();
      }
      setCheckingAuth(false);
    });
  }, []);

  async function cargarTodo() {
    setLoading(true);
    const [ords, evts] = await Promise.all([
      fetchAll('ordenes_directa', 'created_at'),
      fetchAll('ordenes_directa_eventos', 'created_at'),
    ]);
    setOrdenes(ords);
    setEventos(evts);
    setLoading(false);
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
    cargarTodo();
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
    { id: 'diseno', label: 'Nuevo Pedido', icon: '✎', roles: ['admin', 'diseno'] },
    { id: 'general', label: 'Producción', icon: '☷', roles: ['admin', 'diseno', 'administrativo', 'operario', 'encargado', 'logistica', 'comercial'] },
    { id: 'administracion', label: 'Administración', icon: '$', roles: ['admin', 'administrativo'] },
    { id: 'historial', label: 'Historial', icon: '☰', roles: ['admin', 'diseno', 'administrativo', 'operario', 'encargado', 'logistica', 'comercial'] },
  ].filter((n) => n.roles.includes(rol.trim()) || rol.trim() === 'admin');

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20, background: '#1a1a2e', display: 'flex', alignItems: 'center', padding: '0 20px', height: 60, overflowX: 'auto' }}>
        <div style={{ marginRight: 24, whiteSpace: 'nowrap' }}>
          <img src="/logo.png" alt="HYPE printlab" style={{ height: 46, display: 'block' }} />
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginTop: 2 }}>PRODUCCIÓN · DIRECTA</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          {navItems.map((n) => (
            <div
              key={n.id}
              onClick={() => setPagina(n.id)}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                color: pagina === n.id ? '#fff' : 'rgba(255,255,255,0.55)',
                background: pagina === n.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderBottom: pagina === n.id ? '2px solid #e85d2f' : '2px solid transparent',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                textTransform: 'uppercase',
              }}
            >
              <span>{n.icon}</span>
              {n.label}
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

      <div style={{ marginTop: 60, padding: 24, background: '#f5f5f7', minHeight: 'calc(100vh - 60px)' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Cargando...</div>}
        {!loading && (
          <>
            {pagina === 'dashboard' && <Dashboard ordenes={ordenes} />}
            {pagina === 'general' && <VistaGeneral ordenes={ordenes} onCambio={cargarTodo} />}
            {pagina === 'diseno' && <PanelDiseno ordenes={ordenes} nombreUsuario={nombreUsuario} onCambio={cargarTodo} />}
            {pagina === 'administracion' && <PanelAdministracion ordenes={ordenes} onCambio={cargarTodo} />}
            {pagina === 'historial' && <Historial eventos={eventos} ordenes={ordenes} />}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function Dashboard({ ordenes }: { ordenes: OrdenDirecta[] }) {
  const abiertas = ordenes.filter((o) => o.estado_entrega === 'En almacén');
  const bloqueadas = abiertas.filter((o) => !o.puede_producir);
  const atrasadas = ordenes.filter(estaAtrasada);
  const mtsPed = ordenes.reduce((s, o) => s + Number(o.mts_pedidos || 0), 0);
  const mtsImp = ordenes.reduce((s, o) => s + Number(o.mts_impresos || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Dashboard — Directa</div>
        <div style={{ fontSize: 13, color: '#888' }}>Resumen general</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'OT abiertas', value: abiertas.length, sub: 'en almacén' },
          { label: 'Bloqueadas', value: bloqueadas.length, sub: 'esperando algún gate' },
          { label: 'Atrasadas', value: atrasadas.length, sub: 'fijadas hace +3 días sin salir' },
          { label: 'Mts', value: `${mtsImp.toLocaleString()} / ${mtsPed.toLocaleString()}`, sub: 'impresos / pedidos' },
        ].map((m, i) => (
          <div key={i} style={card}>
            <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, marginTop: 4 }}>{m.value}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          OT bloqueadas ({bloqueadas.length}) — no se pueden producir todavía
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['OT', 'Cliente', 'Diseño', 'Falta'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {bloqueadas.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#888' }}>Nada bloqueado 🎉</td></tr>}
              {bloqueadas.slice(0, 20).map((o) => (
                <tr key={o.id}>
                  <td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f' }}>{o.nro_ot}</td>
                  <td style={td}>{o.cliente}</td>
                  <td style={td}>{o.diseno}</td>
                  <td style={{ ...td, color: '#c00' }}>{faltaParaProducir(o).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel Diseño: alta de pedidos + edición de aprob/post
// ---------------------------------------------------------------------------
function PanelDiseno({ ordenes, nombreUsuario, onCambio }: { ordenes: OrdenDirecta[]; nombreUsuario: string; onCambio: () => void }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const prioridad = calcularPrioridad(ordenes);

  async function actualizar(id: number, campo: string, valor: any) {
    const { error } = await supabase.from('ordenes_directa').update({ [campo]: valor }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else onCambio();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Nuevo Pedido</div>
          <div style={{ fontSize: 13, color: '#888' }}>Alta de pedidos, ficha y aprobación</div>
        </div>
        <button onClick={() => setMostrarForm((v) => !v)} style={{ ...btn, background: '#1a1a2e', color: '#fff', border: 'none' }}>
          {mostrarForm ? 'Cerrar' : '+ Nuevo pedido'}
        </button>
      </div>

      {mostrarForm && (
        <FormAltaDiseno
          ordenes={ordenes}
          nombreUsuario={nombreUsuario}
          onGuardado={() => {
            setMostrarForm(false);
            onCambio();
          }}
        />
      )}

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['N', 'OT', 'Fecha', 'Cliente', 'Diseño', 'Tela', 'Mts', 'Aprob', 'Post'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {ordenes.map((o) => (
                <tr key={o.id}>
                  <td style={{ ...td, color: '#888' }}>{prioridad.get(o.id)}</td>
                  <td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f' }}>{o.nro_ot}</td>
                  <td style={td}>{formatFecha(o.fecha)}</td>
                  <td style={td}>{o.cliente}</td>
                  <td style={td}>{o.diseno}</td>
                  <td style={td}>{o.tela || '—'}</td>
                  <td style={td}>{o.mts_pedidos}</td>
                  <td style={td}>
                    <select value={o.aprob} onChange={(e) => actualizar(o.id, 'aprob', e.target.value)} style={selSm}>
                      {APROB_OPCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <input type="checkbox" checked={o.post} onChange={(e) => actualizar(o.id, 'post', e.target.checked)} />
                  </td>
                </tr>
              ))}
              {ordenes.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: '#888' }}>Sin pedidos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface LineaDiseno {
  diseno: string;
  mtsPedidos: string;
  tela: string;
  codTela: string;
  disponibleTela: number | null;
  telaManual: boolean;
  post: boolean;
}

function lineaVacia(telaManualPorDefecto = false): LineaDiseno {
  return { diseno: '', mtsPedidos: '', tela: '', codTela: '', disponibleTela: null, telaManual: telaManualPorDefecto, post: false };
}

function FormAltaDiseno({ ordenes, nombreUsuario, onGuardado }: { ordenes: OrdenDirecta[]; nombreUsuario: string; onGuardado: () => void }) {
  const [modo, setModo] = useState<'nuevo' | 'existente'>('nuevo');
  const [nroOtExistente, setNroOtExistente] = useState('');
  const [nroOtGenerado, setNroOtGenerado] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [equipo, setEquipo] = useState('');
  const [perfil, setPerfil] = useState('');
  const [tipoOt, setTipoOt] = useState('');
  const [cliente, setCliente] = useState('');
  const [guardando, setGuardando] = useState(false);

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
        setEquipo(ref.equipo || '');
        setPerfil(ref.perfil || '');
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

  async function guardar() {
    const nroOt = modo === 'nuevo' ? nroOtGenerado : nroOtExistente;
    if (!nroOt || !cliente) {
      alert('Completá OT y cliente.');
      return;
    }
    const lineasValidas = lineas.filter((l) => l.diseno && parseFloat(l.mtsPedidos));
    if (lineasValidas.length === 0) {
      alert('Cargá al menos un diseño con sus metros pedidos.');
      return;
    }
    const conExceso = lineasValidas.filter((l) => l.disponibleTela !== null && parseFloat(l.mtsPedidos) > l.disponibleTela);
    if (conExceso.length > 0) {
      const detalle = conExceso.map((l) => `${l.diseno} (${l.mtsPedidos} mts pedidos vs ${l.disponibleTela} disponibles)`).join(', ');
      if (!confirm(`Estos diseños superan el stock disponible de su tela: ${detalle}. ¿Guardar igual?`)) return;
    }
    setGuardando(true);
    const { data: filasInsertadas, error } = await supabase
      .from('ordenes_directa')
      .insert(
        lineasValidas.map((l) => ({
          nro_ot: nroOt,
          fecha,
          equipo: equipo || null,
          perfil: perfil || null,
          tipo_ot: tipoOt || null,
          cliente,
          diseno: l.diseno,
          mts_pedidos: parseFloat(l.mtsPedidos),
          tela: l.tela || null,
          cod_tela: l.codTela || null,
          post: l.post,
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
    onGuardado();
  }

  return (
    <div style={{ ...card, marginBottom: 20 }}>
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
        <div><label style={lbl}>Equipo</label>
          <select value={equipo} onChange={(e) => setEquipo(e.target.value)} style={inp} disabled={modo === 'existente'}>
            <option value="">Seleccionar</option>{EQUIPOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Perfil</label>
          <select value={perfil} onChange={(e) => setPerfil(e.target.value)} style={inp} disabled={modo === 'existente'}>
            <option value="">Seleccionar</option>{PERFILES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
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
        <button onClick={guardar} disabled={guardando} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>
          {guardando ? 'Guardando...' : `Guardar ${lineas.length > 1 ? `${lineas.length} diseños` : 'diseño'}`}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel Administración: anticipo, entregar, tipo rto
// ---------------------------------------------------------------------------
function PanelAdministracion({ ordenes, onCambio }: { ordenes: OrdenDirecta[]; onCambio: () => void }) {
  async function actualizar(id: number, campo: string, valor: any) {
    const { error } = await supabase.from('ordenes_directa').update({ [campo]: valor }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else onCambio();
  }

  const pendientesAnticipo = ordenes.filter((o) => o.anticipo === 'PENDIENTE');

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Administración</div>
        <div style={{ fontSize: 13, color: '#888' }}>Anticipo de pedidos</div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: '#c00' }}>
          Pendientes de anticipo ({pendientesAnticipo.length})
        </div>
        <div style={{ ...card, padding: 0, overflow: 'hidden', border: '1px solid #f3c9c9' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['OT', 'Cliente', 'Diseño', 'Mts Ped', 'Anticipo'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {pendientesAnticipo.map((o) => (
                  <tr key={o.id} style={{ background: '#fef3f3' }}>
                    <td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f' }}>{o.nro_ot}</td>
                    <td style={td}>{o.cliente}</td>
                    <td style={td}>{o.diseno}</td>
                    <td style={td}>{o.mts_pedidos}</td>
                    <td style={td}>
                      <select value={o.anticipo} onChange={(e) => actualizar(o.id, 'anticipo', e.target.value)} style={selSm}>
                        {ANTICIPO_OPCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
                {pendientesAnticipo.length === 0 && (
                  <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#888' }}>No hay pedidos pendientes de anticipo 🎉</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Todos los pedidos</div>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['OT', 'Cliente', 'Diseño', 'Anticipo'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {ordenes.map((o) => (
                <tr key={o.id}>
                  <td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f' }}>{o.nro_ot}</td>
                  <td style={td}>{o.cliente}</td>
                  <td style={td}>{o.diseno}</td>
                  <td style={td}>
                    <select value={o.anticipo} onChange={(e) => actualizar(o.id, 'anticipo', e.target.value)} style={selSm}>
                      {ANTICIPO_OPCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {ordenes.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#888' }}>Sin pedidos</td></tr>}
            </tbody>
          </table>
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
function VistaGeneral({ ordenes, onCambio }: { ordenes: OrdenDirecta[]; onCambio: () => void }) {
  const [search, setSearch] = useState('');
  const prioridad = calcularPrioridad(ordenes);

  async function actualizar(id: number, campo: string, valor: any) {
    const { error } = await supabase.from('ordenes_directa').update({ [campo]: valor }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else onCambio();
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

  // Al elegir un operario en "Op Imp" se pinta la fila de verde. Al elegir
  // "NO" se pinta de rojo y pide el motivo por el que no se pudo imprimir.
  async function actualizarImpOperario(o: OrdenDirecta, valor: string) {
    if (valor === 'NO') {
      const motivo = window.prompt('¿Por qué no se pudo imprimir este pedido?', o.motivo_no_impreso || '');
      if (motivo === null) return; // canceló, no guarda nada
      const { error } = await supabase.from('ordenes_directa').update({ imp_operario: 'NO', motivo_no_impreso: motivo }).eq('id', o.id);
      if (error) alert('Error: ' + error.message);
      else onCambio();
      return;
    }
    const { error } = await supabase.from('ordenes_directa').update({ imp_operario: valor || null, motivo_no_impreso: null }).eq('id', o.id);
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

  const filtradas = ordenes.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.nro_ot.toLowerCase().includes(q) || o.cliente.toLowerCase().includes(q) || o.diseno.toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Producción</div>
          <div style={{ fontSize: 13, color: '#888' }}>Todos los pedidos y todos los campos, editable por cualquiera</div>
        </div>
        <input placeholder="Buscar por OT, cliente o diseño..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inp, maxWidth: 280 }} />
      </div>
      <style>{`
        .vg-grid th, .vg-grid td { border: 1px solid #ddd !important; text-align: center !important; }
      `}</style>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="vg-grid" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['N', 'Prod', 'Fecha Pedido', 'Nro OT', 'Cliente', 'Diseño', 'Mts Ped', 'Mts Imp', 'Observaciones', 'Tela', 'ID', 'Aprob', 'Op Imp', 'Post', 'Op Fij', 'Fecha fin', 'Prep', '¿Entregar?', 'Tipo RTO', 'Nº RTO', 'Bultos', 'Estado entrega', 'Entregó', 'Recibió'].map((h) => {
                  const esEntregaEnAdelante = ['¿Entregar?', 'Tipo RTO', 'Nº RTO', 'Bultos', 'Estado entrega', 'Entregó', 'Recibió'].includes(h);
                  return (
                    <th key={h} style={{ ...th, textTransform: 'uppercase', background: esEntregaEnAdelante ? '#8e6fc9' : '#e85d2f', color: '#fff', fontWeight: 700, ...(h === 'Prod' ? { width: 40 } : {}) }}>{h}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && <tr><td colSpan={24} style={{ ...td, textAlign: 'center', color: '#888' }}>Sin pedidos</td></tr>}
              {filtradas.map((o) => {
                const filaColor = o.fecha_fin ? '#8fce8a' : o.imp_operario === 'NO' ? '#fde8e8' : o.imp_operario ? '#e6f4e1' : undefined;
                return (
                <tr key={o.id} style={filaColor ? { background: filaColor } : undefined}>
                  <td style={{ ...td, color: '#888' }}>{prioridad.get(o.id)}</td>
                  <td style={{ ...td, width: 40 }}>
                    <span style={{ padding: '2px 6px', borderRadius: 12, fontSize: 10, fontWeight: 700, color: '#fff', background: o.puede_producir ? '#3B6D11' : '#c00' }}>
                      {o.puede_producir ? 'SÍ' : 'NO'}
                    </span>
                  </td>
                  <td style={{ ...td, minWidth: 140 }}><input type="date" defaultValue={o.fecha} onBlur={(e) => actualizar(o.id, 'fecha', e.target.value)} style={{ ...selSm, width: '100%', minWidth: 130 }} /></td>
                  <td style={{ ...td, width: 55, fontFamily: 'monospace', color: '#e85d2f' }} title={o.nro_ot}>{o.nro_ot.slice(-6)}</td>
                  <td style={{ ...td, minWidth: 170 }}><input defaultValue={o.cliente} onBlur={(e) => actualizar(o.id, 'cliente', e.target.value)} style={{ ...selSm, width: '100%', minWidth: 160 }} /></td>
                  <td style={{ ...td, minWidth: 170 }}><input defaultValue={o.diseno} onBlur={(e) => actualizar(o.id, 'diseno', e.target.value)} style={{ ...selSm, width: '100%', minWidth: 160 }} /></td>
                  <td style={td}>
                    <input type="number" defaultValue={o.mts_pedidos} onBlur={(e) => actualizar(o.id, 'mts_pedidos', parseFloat(e.target.value) || 0)} style={{ ...selSm, width: 60 }} />
                  </td>
                  <td style={td}>
                    <input type="number" defaultValue={o.mts_impresos} onBlur={(e) => actualizarMtsImpresos(o, e.target.value)} style={{ ...selSm, width: 60 }} />
                  </td>
                  <td style={{ ...td, minWidth: 180 }}><input defaultValue={o.observaciones || ''} onBlur={(e) => actualizar(o.id, 'observaciones', e.target.value || null)} style={{ ...selSm, width: '100%', minWidth: 170 }} /></td>
                  <td style={{ ...td, minWidth: 190 }}>
                    <input
                      defaultValue={o.tela || ''}
                      onBlur={(e) => { actualizar(o.id, 'tela', e.target.value || null); buscarCodTela(o, e.target.value); }}
                      style={{ ...selSm, width: '100%', minWidth: 180 }}
                    />
                  </td>
                  <td style={{ ...td, width: 70, fontFamily: 'monospace', color: '#888', fontSize: 10 }}>{o.cod_tela || '—'}</td>
                  <td style={{ ...td, width: 95 }}>
                    <select value={o.aprob} onChange={(e) => actualizar(o.id, 'aprob', e.target.value)} style={{ ...selSm, width: 90, fontSize: 10, padding: '3px 2px' }}>
                      {APROB_OPCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </td>
                  <td style={{ ...td, width: 90 }} title={o.motivo_no_impreso || undefined}>
                    <select value={o.imp_operario || ''} onChange={(e) => actualizarImpOperario(o, e.target.value)} style={{ ...selSm, width: 85 }}>
                      <option value="">—</option>
                      <option value="NO">NO</option>
                      {OPERARIOS_IMPRESION.map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </td>
                  <td style={td}><input type="checkbox" checked={o.post} onChange={(e) => actualizar(o.id, 'post', e.target.checked)} /></td>
                  <td style={td} title={o.imp_operario === 'NO' ? 'No se puede fijar: no se imprimió' : undefined}>
                    {o.imp_operario === 'NO' ? (
                      <span style={{ fontSize: 11, color: '#c00' }}>—</span>
                    ) : (
                      <select value={o.fija_operario || ''} onChange={(e) => actualizar(o.id, 'fija_operario', e.target.value || null)} disabled={!o.imp_operario} style={selSm}>
                        <option value="">—</option>{OPERARIOS_FIJACION.map((op) => <option key={op} value={op}>{op}</option>)}
                      </select>
                    )}
                  </td>
                  <td style={td}>{formatFecha(o.fecha_fin)}</td>
                  <td style={td}>
                    <input type="checkbox" checked={o.prep} onChange={(e) => actualizar(o.id, 'prep', e.target.checked)} />
                  </td>
                  <td style={td}>
                    <select value={o.entregar === null ? '' : o.entregar ? 'si' : 'no'} onChange={(e) => actualizar(o.id, 'entregar', e.target.value === '' ? null : e.target.value === 'si')} style={selSm}>
                      <option value="">—</option><option value="si">Sí</option><option value="no">No</option>
                    </select>
                  </td>
                  <td style={td}>
                    <select value={o.tipo_rto || ''} onChange={(e) => actualizar(o.id, 'tipo_rto', e.target.value || null)} style={selSm}>
                      <option value="">—</option>{TIPO_RTO_OPCIONES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={td}><input defaultValue={o.nro_rto || ''} onBlur={(e) => actualizarNroRto(o, e.target.value)} style={{ ...selSm, width: 80 }} /></td>
                  <td style={td}>
                    <input type="number" placeholder="1" defaultValue={o.bulto_actual || ''} onBlur={(e) => actualizar(o.id, 'bulto_actual', parseInt(e.target.value) || null)} style={{ ...selSm, width: 36 }} />
                    /
                    <input type="number" placeholder="1" defaultValue={o.bulto_total || ''} onBlur={(e) => actualizar(o.id, 'bulto_total', parseInt(e.target.value) || null)} style={{ ...selSm, width: 36 }} />
                  </td>
                  <td style={td}>
                    <select value={o.estado_entrega} onChange={(e) => actualizar(o.id, 'estado_entrega', e.target.value)} style={selSm}>
                      {ESTADO_ENTREGA_OPCIONES.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <select value={o.entrego || ''} onChange={(e) => actualizarEntrego(o, e.target.value)} style={selSm}>
                      <option value="">—</option>{OPERARIOS_ENTREGA.map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </td>
                  <td style={td}><input defaultValue={o.recibio || ''} onBlur={(e) => actualizarRecibio(o, e.target.value)} style={{ ...selSm, width: 80 }} /></td>
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
// Historial de eventos
// ---------------------------------------------------------------------------
function Historial({ eventos, ordenes }: { eventos: EventoDirecta[]; ordenes: OrdenDirecta[] }) {
  const mapOrden = new Map(ordenes.map((o) => [o.id, o]));
  const [search, setSearch] = useState('');

  const eventosFiltrados = eventos.filter((e) => {
    if (!search) return true;
    const o = mapOrden.get(e.orden_id);
    const q = search.toLowerCase();
    return (o?.cliente || '').toLowerCase().includes(q) || (o?.diseno || '').toLowerCase().includes(q) || (o?.nro_ot || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Historial</div>
          <div style={{ fontSize: 13, color: '#888' }}>Todos los hitos registrados automáticamente</div>
        </div>
        <input placeholder="Buscar por OT, cliente o diseño..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inp, maxWidth: 280 }} />
      </div>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Fecha', 'OT', 'Cliente', 'Diseño', 'Evento', 'Detalle'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {eventosFiltrados.slice(0, 300).map((e) => {
                const o = mapOrden.get(e.orden_id);
                return (
                  <tr key={e.id}>
                    <td style={td}>{new Date(e.created_at).toLocaleString()}</td>
                    <td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f' }}>{o?.nro_ot || `#${e.orden_id}`}</td>
                    <td style={td}>{o?.cliente || '—'}</td>
                    <td style={td}>{o?.diseno || '—'}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{e.evento}</td>
                    <td style={td}>{e.detalle || '—'}</td>
                  </tr>
                );
              })}
              {eventosFiltrados.length === 0 && (
                <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#888' }}>Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
