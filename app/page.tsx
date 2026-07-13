'use client';
import { useEffect, useState } from 'react';
import { supabase, fetchAll, stockPorCliente, StockDisponible } from '../lib/supabaseClient';
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
    { id: 'general', label: 'Producción', icon: '☷', roles: ['admin', 'diseno', 'administrativo', 'operario', 'encargado', 'logistica', 'comercial'] },
    { id: 'diseno', label: 'Nuevo Pedido', icon: '✎', roles: ['admin', 'diseno'] },
    { id: 'administracion', label: 'Administración', icon: '$', roles: ['admin', 'administrativo'] },
    { id: 'impresion', label: 'Impresión', icon: '◫', roles: ['admin', 'operario'] },
    { id: 'preparacion', label: 'Preparación/Terminación', icon: '◫', roles: ['admin', 'encargado'] },
    { id: 'historial', label: 'Historial', icon: '☰', roles: ['admin', 'diseno', 'administrativo', 'operario', 'encargado', 'logistica', 'comercial'] },
  ].filter((n) => n.roles.includes(rol.trim()) || rol.trim() === 'admin');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ width: 210, background: '#1a1a2e', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: 3 }}>HYPE</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, marginTop: 6 }}>PRODUCCIÓN · DIRECTA</div>
        </div>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{nombreUsuario}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>{rol}</div>
        </div>
        {navItems.map((n) => (
          <div
            key={n.id}
            onClick={() => setPagina(n.id)}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              color: pagina === n.id ? '#fff' : 'rgba(255,255,255,0.55)',
              background: pagina === n.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              borderLeft: pagina === n.id ? '2px solid #e85d2f' : '2px solid transparent',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span>{n.icon}</span>
            {n.label}
          </div>
        ))}
        <div style={{ marginTop: 'auto', padding: 16 }}>
          <button onClick={cerrarSesion} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: 12, cursor: 'pointer' }}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div style={{ marginLeft: 210, padding: 24, flex: 1, background: '#f5f5f7', minHeight: '100vh' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Cargando...</div>}
        {!loading && (
          <>
            {pagina === 'dashboard' && <Dashboard ordenes={ordenes} />}
            {pagina === 'general' && <VistaGeneral ordenes={ordenes} onCambio={cargarTodo} />}
            {pagina === 'diseno' && <PanelDiseno ordenes={ordenes} nombreUsuario={nombreUsuario} onCambio={cargarTodo} />}
            {pagina === 'administracion' && <PanelAdministracion ordenes={ordenes} onCambio={cargarTodo} />}
            {pagina === 'impresion' && <PanelImpresion ordenes={ordenes} onCambio={cargarTodo} />}
            {pagina === 'preparacion' && <PanelPreparacion ordenes={ordenes} onCambio={cargarTodo} />}
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

function FormAltaDiseno({ ordenes, nombreUsuario, onGuardado }: { ordenes: OrdenDirecta[]; nombreUsuario: string; onGuardado: () => void }) {
  const [modo, setModo] = useState<'nuevo' | 'existente'>('nuevo');
  const [nroOtExistente, setNroOtExistente] = useState('');
  const [nroOtGenerado, setNroOtGenerado] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [equipo, setEquipo] = useState('');
  const [perfil, setPerfil] = useState('');
  const [tipoOt, setTipoOt] = useState('');
  const [cliente, setCliente] = useState('');
  const [diseno, setDiseno] = useState('');
  const [mtsPedidos, setMtsPedidos] = useState('');
  const [tela, setTela] = useState('');
  const [codTela, setCodTela] = useState('');
  const [post, setPost] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Autocompletar cliente + telas disponibles desde la base de Stock
  const [clientesStock, setClientesStock] = useState<string[]>([]);
  const [showClientes, setShowClientes] = useState(false);
  const [stockCliente, setStockCliente] = useState<StockDisponible[]>([]);
  const [buscandoStock, setBuscandoStock] = useState(false);
  const [telaManual, setTelaManual] = useState(false);
  const [disponibleTela, setDisponibleTela] = useState<number | null>(null);

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
    setTelaManual(disponible.length === 0);
  }

  function seleccionarCliente(nombreCliente: string) {
    setCliente(nombreCliente);
    setShowClientes(false);
    setTela('');
    setCodTela('');
    setDisponibleTela(null);
    buscarStockDeCliente(nombreCliente);
  }

  function seleccionarTela(idHype: string) {
    const item = stockCliente.find((s) => s.id_hype === idHype);
    if (!item) return;
    setTela(item.tela);
    setCodTela(item.id_hype);
    setDisponibleTela(item.disponible);
  }

  const excedeStock = disponibleTela !== null && parseFloat(mtsPedidos || '0') > disponibleTela;

  async function guardar() {
    const nroOt = modo === 'nuevo' ? nroOtGenerado : nroOtExistente;
    if (!nroOt || !cliente || !diseno || !parseFloat(mtsPedidos)) {
      alert('Completá OT, cliente, diseño y metros pedidos.');
      return;
    }
    if (excedeStock && !confirm(`El pedido (${mtsPedidos} mts) supera el stock disponible de esta tela (${disponibleTela} mts). ¿Guardar igual?`)) {
      return;
    }
    setGuardando(true);
    const { error } = await supabase.from('ordenes_directa').insert([
      {
        nro_ot: nroOt,
        fecha,
        equipo: equipo || null,
        perfil: perfil || null,
        tipo_ot: tipoOt || null,
        cliente,
        diseno,
        mts_pedidos: parseFloat(mtsPedidos),
        tela: tela || null,
        cod_tela: codTela || null,
        post,
        creado_por: nombreUsuario,
      },
    ]);
    setGuardando(false);
    if (error) {
      alert('Error al guardar: ' + error.message);
      return;
    }
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
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
        <div><label style={lbl}>Diseño</label><input value={diseno} onChange={(e) => setDiseno(e.target.value)} style={inp} /></div>
        <div>
          <label style={lbl}>Mts pedidos</label>
          <input type="number" value={mtsPedidos} onChange={(e) => setMtsPedidos(e.target.value)} style={{ ...inp, borderColor: excedeStock ? '#c00' : '#ddd', color: excedeStock ? '#c00' : undefined }} />
        </div>

        <div style={{ gridColumn: telaManual ? 'auto' : '1/-1' }}>
          <label style={lbl}>
            Tela {buscandoStock && '(buscando en stock...)'}
            {!buscandoStock && stockCliente.length > 0 && (
              <button onClick={() => setTelaManual((v) => !v)} style={{ marginLeft: 8, fontSize: 11, color: '#e85d2f', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {telaManual ? '(usar tela de stock)' : '(escribir tela manualmente)'}
              </button>
            )}
          </label>
          {telaManual ? (
            <input value={tela} onChange={(e) => { setTela(e.target.value); setCodTela(''); setDisponibleTela(null); }} placeholder="Nombre de la tela" style={inp} />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {stockCliente.length === 0 && !buscandoStock && (
                <div style={{ fontSize: 12, color: '#888' }}>Ingresá el cliente para ver sus telas en stock.</div>
              )}
              {stockCliente.map((s) => (
                <div
                  key={s.id_hype}
                  onClick={() => seleccionarTela(s.id_hype)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: codTela === s.id_hype ? '2px solid #e85d2f' : '1px solid #ddd',
                    cursor: 'pointer',
                    fontSize: 12,
                    background: codTela === s.id_hype ? '#fff5f0' : '#fff',
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
          )}
          {disponibleTela !== null && (
            <div style={{ marginTop: 6, fontSize: 12, color: excedeStock ? '#c00' : '#3B6D11', fontWeight: 600 }}>
              {excedeStock
                ? `⚠ El pedido supera el stock disponible (${disponibleTela.toLocaleString()} mts)`
                : `Stock disponible: ${disponibleTela.toLocaleString()} mts`}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18 }}>
          <input type="checkbox" checked={post} onChange={(e) => setPost(e.target.checked)} id="post" />
          <label htmlFor="post" style={{ fontSize: 13 }}>Requiere postratado</label>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={guardar} disabled={guardando} style={{ ...btn, background: '#e85d2f', color: '#fff', border: '1px solid #e85d2f' }}>
          {guardando ? 'Guardando...' : 'Guardar diseño'}
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

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Administración</div>
        <div style={{ fontSize: 13, color: '#888' }}>Anticipo, autorización de entrega y tipo de remito</div>
      </div>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['OT', 'Cliente', 'Diseño', 'Anticipo', '¿Entregar?', 'Tipo RTO'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
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
                </tr>
              ))}
              {ordenes.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#888' }}>Sin pedidos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel Impresión: quién imprimió + mts impresos
// ---------------------------------------------------------------------------
function PanelImpresion({ ordenes, onCambio }: { ordenes: OrdenDirecta[]; onCambio: () => void }) {
  const pendientes = ordenes.filter((o) => o.puede_producir && o.mts_impresos < o.mts_pedidos);
  const [valores, setValores] = useState<Record<number, { operario: string; mts: string }>>({});

  function setValor(id: number, campo: 'operario' | 'mts', valor: string) {
    setValores((prev) => ({ ...prev, [id]: { ...(prev[id] || { operario: '', mts: '' }), [campo]: valor } }));
  }

  async function guardar(o: OrdenDirecta) {
    const v = valores[o.id];
    if (!v?.operario || !v?.mts) {
      alert('Elegí operario y metros impresos.');
      return;
    }
    const mtsNuevos = parseFloat(v.mts);
    const { error } = await supabase
      .from('ordenes_directa')
      .update({ imp_operario: v.operario, mts_impresos: mtsNuevos })
      .eq('id', o.id);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    // Si esta OT tiene un id de stock asociado, descontamos ese consumo
    // como un egreso real en Stock (mismo criterio que usa la app de Stock).
    const delta = mtsNuevos - Number(o.mts_impresos || 0);
    if (o.cod_tela && delta > 0) {
      const { error: errorEgreso } = await supabase.from('egresos').insert([
        {
          fecha: new Date().toISOString().split('T')[0],
          cliente: o.cliente,
          tela: o.tela,
          id_hype: o.cod_tela,
          mts: delta,
          estado: 'A producción',
          observaciones: `OT ${o.nro_ot} · Directa · impreso por ${v.operario}`,
        },
      ]);
      if (errorEgreso) {
        console.error('No se pudo descontar stock automáticamente:', errorEgreso);
        alert('Se guardó la impresión, pero no se pudo descontar el stock automáticamente (revisar conexión con Stock).');
      }
    }
    onCambio();
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Impresión</div>
        <div style={{ fontSize: 13, color: '#888' }}>{pendientes.length} diseños habilitados para imprimir</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pendientes.length === 0 && <div style={{ ...card, textAlign: 'center', color: '#888' }}>No hay nada habilitado para imprimir por ahora.</div>}
        {pendientes.map((o) => (
          <div key={o.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 120 }}>
              <div style={{ fontFamily: 'monospace', color: '#e85d2f', fontSize: 12 }}>{o.nro_ot}</div>
              <div style={{ fontWeight: 600 }}>{o.cliente}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{o.diseno} · {o.tela}</div>
            </div>
            <div style={{ fontSize: 13, color: '#888' }}>{o.mts_impresos} / {o.mts_pedidos} mts</div>
            <select value={valores[o.id]?.operario || o.imp_operario || ''} onChange={(e) => setValor(o.id, 'operario', e.target.value)} style={{ ...inp, maxWidth: 140 }}>
              <option value="">Operario...</option>
              {OPERARIOS_IMPRESION.map((op) => <option key={op} value={op}>{op}</option>)}
            </select>
            <input
              type="number"
              placeholder="Mts impresos"
              defaultValue={o.mts_impresos || undefined}
              onChange={(e) => setValor(o.id, 'mts', e.target.value)}
              style={{ ...inp, maxWidth: 120 }}
            />
            <button onClick={() => guardar(o)} style={{ ...btn, background: '#1a1a2e', color: '#fff', border: 'none' }}>Guardar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel Preparación / Terminación
// ---------------------------------------------------------------------------
function PanelPreparacion({ ordenes, onCambio }: { ordenes: OrdenDirecta[]; onCambio: () => void }) {
  const pendientesPrep = ordenes.filter((o) => !o.prep && o.anticipo !== 'PENDIENTE' && ['C APROB', 'S APROB'].includes(o.aprob));
  const pendientesTerminacion = ordenes.filter((o) => o.mts_impresos > 0 && o.estado_entrega === 'En almacén');

  async function actualizar(id: number, campo: string, valor: any) {
    const { error } = await supabase.from('ordenes_directa').update({ [campo]: valor }).eq('id', id);
    if (error) alert('Error: ' + error.message);
    else onCambio();
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Preparación / Terminación</div>
        <div style={{ fontSize: 13, color: '#888' }}>Tela lista para producir, y fijación / remito / entrega</div>
      </div>

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Tela pendiente de preparar ({pendientesPrep.length})
        </div>
        {pendientesPrep.length === 0 && <div style={{ color: '#888', fontSize: 13 }}>Nada pendiente.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pendientesPrep.map((o) => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
              <span style={{ fontFamily: 'monospace', color: '#e85d2f', fontSize: 12 }}>{o.nro_ot}</span>
              <span style={{ fontWeight: 600 }}>{o.cliente}</span>
              <span style={{ fontSize: 13, color: '#666' }}>{o.diseno} · {o.tela}</span>
              <button onClick={() => actualizar(o.id, 'prep', true)} style={{ ...btn, marginLeft: 'auto', background: '#3B6D11', color: '#fff', border: 'none' }}>Marcar tela lista</button>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Fijación, remito y entrega ({pendientesTerminacion.length})
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['OT', 'Cliente', 'Fija', 'Fecha fin', 'Nº RTO', 'Bultos', 'Estado', 'Entregó', 'Recibió'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {pendientesTerminacion.map((o) => (
                <tr key={o.id}>
                  <td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f' }}>{o.nro_ot}</td>
                  <td style={td}>{o.cliente}</td>
                  <td style={td}>
                    <select value={o.fija_operario || ''} onChange={(e) => actualizar(o.id, 'fija_operario', e.target.value || null)} style={selSm}>
                      <option value="">—</option>{OPERARIOS_FIJACION.map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </td>
                  <td style={td}>{formatFecha(o.fecha_fin)}</td>
                  <td style={td}><input defaultValue={o.nro_rto || ''} onBlur={(e) => actualizar(o.id, 'nro_rto', e.target.value || null)} style={{ ...selSm, width: 90 }} /></td>
                  <td style={td}>
                    <input type="number" placeholder="1" defaultValue={o.bulto_actual || ''} onBlur={(e) => actualizar(o.id, 'bulto_actual', parseInt(e.target.value) || null)} style={{ ...selSm, width: 40 }} />
                    /
                    <input type="number" placeholder="1" defaultValue={o.bulto_total || ''} onBlur={(e) => actualizar(o.id, 'bulto_total', parseInt(e.target.value) || null)} style={{ ...selSm, width: 40 }} />
                  </td>
                  <td style={td}>
                    <select value={o.estado_entrega} onChange={(e) => actualizar(o.id, 'estado_entrega', e.target.value)} style={selSm}>
                      {ESTADO_ENTREGA_OPCIONES.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td style={td}><input defaultValue={o.entrego || ''} onBlur={(e) => actualizar(o.id, 'entrego', e.target.value || null)} style={{ ...selSm, width: 90 }} /></td>
                  <td style={td}><input defaultValue={o.recibio || ''} onBlur={(e) => actualizar(o.id, 'recibio', e.target.value || null)} style={{ ...selSm, width: 90 }} /></td>
                </tr>
              ))}
              {pendientesTerminacion.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: '#888' }}>Nada impreso pendiente de terminar</td></tr>}
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
    if (o.cod_tela && delta > 0) {
      const { error: errorEgreso } = await supabase.from('egresos').insert([
        {
          fecha: new Date().toISOString().split('T')[0],
          cliente: o.cliente,
          tela: o.tela,
          id_hype: o.cod_tela,
          mts: delta,
          estado: 'A producción',
          observaciones: `OT ${o.nro_ot} · Directa · cargado desde Vista General`,
        },
      ]);
      if (errorEgreso) console.error('No se pudo descontar stock automáticamente:', errorEgreso);
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
                {['N', 'Prod', 'Fecha Pedido', 'Nro OT', 'Cliente', 'Diseño', 'Tela', 'Mts Ped', 'Mts Imp', 'Aprob', 'Post', 'Anticipo', '¿Entregar?', 'Tipo RTO', 'Op. Impresión', 'Op. Fijación', 'Fecha fin', 'Prep', 'Nº RTO', 'Bultos', 'Estado entrega', 'Entregó', 'Recibió'].map((h) => (
                  <th key={h} style={{ ...th, textTransform: 'uppercase', background: '#e85d2f', color: '#fff', fontWeight: 700, ...(h === 'Prod' ? { width: 40 } : {}) }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && <tr><td colSpan={23} style={{ ...td, textAlign: 'center', color: '#888' }}>Sin pedidos</td></tr>}
              {filtradas.map((o) => (
                <tr key={o.id}>
                  <td style={{ ...td, color: '#888' }}>{prioridad.get(o.id)}</td>
                  <td style={{ ...td, width: 40 }}>
                    <span style={{ padding: '2px 6px', borderRadius: 12, fontSize: 10, fontWeight: 700, color: '#fff', background: o.puede_producir ? '#3B6D11' : '#c00' }}>
                      {o.puede_producir ? 'SÍ' : 'NO'}
                    </span>
                  </td>
                  <td style={td}><input type="date" defaultValue={o.fecha} onBlur={(e) => actualizar(o.id, 'fecha', e.target.value)} style={{ ...selSm, width: 100 }} /></td>
                  <td style={{ ...td, width: 55, fontFamily: 'monospace', color: '#e85d2f' }} title={o.nro_ot}>{o.nro_ot.slice(-6)}</td>
                  <td style={{ ...td, minWidth: 170 }}><input defaultValue={o.cliente} onBlur={(e) => actualizar(o.id, 'cliente', e.target.value)} style={{ ...selSm, width: '100%', minWidth: 160 }} /></td>
                  <td style={td}><input defaultValue={o.diseno} onBlur={(e) => actualizar(o.id, 'diseno', e.target.value)} style={{ ...selSm, width: 100 }} /></td>
                  <td style={{ ...td, minWidth: 150 }}><input defaultValue={o.tela || ''} onBlur={(e) => actualizar(o.id, 'tela', e.target.value || null)} style={{ ...selSm, width: '100%', minWidth: 140 }} /></td>
                  <td style={td}>
                    <input type="number" defaultValue={o.mts_pedidos} onBlur={(e) => actualizar(o.id, 'mts_pedidos', parseFloat(e.target.value) || 0)} style={{ ...selSm, width: 60 }} />
                  </td>
                  <td style={td}>
                    <input type="number" defaultValue={o.mts_impresos} onBlur={(e) => actualizarMtsImpresos(o, e.target.value)} style={{ ...selSm, width: 60 }} />
                  </td>
                  <td style={td}>
                    <select value={o.aprob} onChange={(e) => actualizar(o.id, 'aprob', e.target.value)} style={selSm}>
                      {APROB_OPCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </td>
                  <td style={td}><input type="checkbox" checked={o.post} onChange={(e) => actualizar(o.id, 'post', e.target.checked)} /></td>
                  <td style={td}>
                    <select value={o.anticipo} onChange={(e) => actualizar(o.id, 'anticipo', e.target.value)} style={selSm}>
                      {ANTICIPO_OPCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
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
                  <td style={td}>
                    <select value={o.imp_operario || ''} onChange={(e) => actualizar(o.id, 'imp_operario', e.target.value || null)} style={selSm}>
                      <option value="">—</option>{OPERARIOS_IMPRESION.map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <select value={o.fija_operario || ''} onChange={(e) => actualizar(o.id, 'fija_operario', e.target.value || null)} style={selSm}>
                      <option value="">—</option>{OPERARIOS_FIJACION.map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </td>
                  <td style={td}>{formatFecha(o.fecha_fin)}</td>
                  <td style={td}>
                    <input type="checkbox" checked={o.prep} onChange={(e) => actualizar(o.id, 'prep', e.target.checked)} />
                  </td>
                  <td style={td}><input defaultValue={o.nro_rto || ''} onBlur={(e) => actualizar(o.id, 'nro_rto', e.target.value || null)} style={{ ...selSm, width: 80 }} /></td>
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
                  <td style={td}><input defaultValue={o.entrego || ''} onBlur={(e) => actualizar(o.id, 'entrego', e.target.value || null)} style={{ ...selSm, width: 80 }} /></td>
                  <td style={td}><input defaultValue={o.recibio || ''} onBlur={(e) => actualizar(o.id, 'recibio', e.target.value || null)} style={{ ...selSm, width: 80 }} /></td>
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
// Historial de eventos
// ---------------------------------------------------------------------------
function Historial({ eventos, ordenes }: { eventos: EventoDirecta[]; ordenes: OrdenDirecta[] }) {
  const mapOrden = new Map(ordenes.map((o) => [o.id, o]));
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 500 }}>Historial</div>
        <div style={{ fontSize: 13, color: '#888' }}>Todos los hitos registrados automáticamente</div>
      </div>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Fecha', 'OT', 'Cliente', 'Evento', 'Detalle'].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {eventos.slice(0, 300).map((e) => {
                const o = mapOrden.get(e.orden_id);
                return (
                  <tr key={e.id}>
                    <td style={td}>{new Date(e.created_at).toLocaleString()}</td>
                    <td style={{ ...td, fontFamily: 'monospace', color: '#e85d2f' }}>{o?.nro_ot || `#${e.orden_id}`}</td>
                    <td style={td}>{o?.cliente || '—'}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{e.evento}</td>
                    <td style={td}>{e.detalle || '—'}</td>
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
