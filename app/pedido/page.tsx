'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

// Formulario público de pedido (calcado del Excel "FORM DE PEDIDO" que hoy
// se manda por mail a ventas@hypearg.com). No requiere login. Lo que se
// carga acá NO entra directo a Producción — queda como una "solicitud
// pendiente" que el personal de HYPE revisa y confirma manualmente desde
// Ingreso y Modificación de Pedidos (ahí se le asigna el Nro OT y el
// precio, que no le pedimos al cliente).
const TIPOS_TRABAJO = ['DIRECTA (ALG/LINO)', 'SUBLIMACIÓN'];

const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 };
const lbl: React.CSSProperties = { fontSize: 12, color: '#555', display: 'block', marginBottom: 6, fontWeight: 600 };
const btn: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 13, cursor: 'pointer' };

interface LineaPedido {
  telaOrigen: 'CLIENTE' | 'HYPE' | '';
  diseno: string;
  cantidadMts: string;
  observaciones: string;
}

function lineaVacia(): LineaPedido {
  return { telaOrigen: '', diseno: '', cantidadMts: '', observaciones: '' };
}

export default function PedidoCliente() {
  const [tipoTrabajo, setTipoTrabajo] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [cp, setCp] = useState('');
  const [provincia, setProvincia] = useState('');
  const [lineas, setLineas] = useState<LineaPedido[]>([lineaVacia()]);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');
  // Antes de mandar de verdad, se muestra el aviso del plazo de 72hs para
  // enviar la tela (si es tela cliente) — recién con el "Entendido" de ese
  // cartel se dispara el envío real.
  const [mostrarAviso, setMostrarAviso] = useState(false);

  function actualizarLinea(idx: number, cambios: Partial<LineaPedido>) {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...cambios } : l)));
  }
  function agregarLinea() {
    setLineas((prev) => [...prev, lineaVacia()]);
  }
  function quitarLinea(idx: number) {
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  // Valida los datos y, si está todo bien, muestra el aviso del plazo de
  // 72hs antes de mandar el pedido de verdad.
  function intentarEnviar() {
    const lineasValidas = lineas.filter((l) => l.diseno.trim() && parseFloat(l.cantidadMts));
    if (!empresa.trim() || lineasValidas.length === 0) {
      setError('Completá al menos Empresa / Razón Social y un diseño con su cantidad de mts.');
      return;
    }
    setError('');
    setMostrarAviso(true);
  }

  async function confirmarYEnviar() {
    const lineasValidas = lineas.filter((l) => l.diseno.trim() && parseFloat(l.cantidadMts));
    setMostrarAviso(false);
    setEnviando(true);

    const { data: solicitud, error: errorHeader } = await supabase
      .from('solicitudes_pedido')
      .insert({
        tipo_trabajo: tipoTrabajo || null,
        empresa: empresa.trim(),
        contacto: contacto.trim() || null,
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        direccion: direccion.trim() || null,
        cp: cp.trim() || null,
        provincia: provincia.trim() || null,
      })
      .select()
      .single();

    if (errorHeader || !solicitud) {
      setEnviando(false);
      setError('No se pudo enviar el pedido. Probá de nuevo en unos minutos.');
      console.error(errorHeader);
      return;
    }

    const { error: errorLineas } = await supabase.from('solicitudes_pedido_lineas').insert(
      lineasValidas.map((l) => ({
        solicitud_id: solicitud.id,
        tela_origen: l.telaOrigen || null,
        diseno: l.diseno.trim(),
        cantidad_mts: parseFloat(l.cantidadMts) || 0,
        observaciones: l.observaciones.trim() || null,
      }))
    );

    setEnviando(false);
    if (errorLineas) {
      setError('El pedido se creó pero hubo un problema al cargar los diseños. Escribinos para confirmarlo.');
      console.error(errorLineas);
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 420, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>¡Pedido enviado!</div>
          <div style={{ fontSize: 14, color: '#666' }}>Lo recibimos y lo vamos a revisar antes de cargarlo en producción. Gracias.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', padding: '40px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', borderRadius: 12, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <img src="/logo.png" alt="HYPE printlab" style={{ height: 40, marginBottom: 8 }} />
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Form de pedido</div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
          Fecha: {new Date().toLocaleDateString('es-AR')} (se carga sola)
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Completá los datos de tu pedido. Lo vamos a revisar antes de confirmarlo.</div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Tipo de trabajo</label>
          <select value={tipoTrabajo} onChange={(e) => setTipoTrabajo(e.target.value)} style={inp}>
            <option value="">—</option>
            {TIPOS_TRABAJO.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Empresa / Marca y Razón Social *</label>
          <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} style={inp} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Contacto</label>
            <input value={contacto} onChange={(e) => setContacto(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Teléfono</label>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} style={inp} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Dirección</label>
          <input value={direccion} onChange={(e) => setDireccion(e.target.value)} style={inp} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
          <div>
            <label style={lbl}>CP</label>
            <input value={cp} onChange={(e) => setCp(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Provincia</label>
            <input value={provincia} onChange={(e) => setProvincia(e.target.value)} style={inp} />
          </div>
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase' }}>Diseños</div>

        {lineas.map((l, idx) => (
          <div key={idx} style={{ border: '1px solid #eee', borderRadius: 10, padding: 16, marginBottom: 12, position: 'relative' }}>
            {lineas.length > 1 && (
              <button onClick={() => quitarLinea(idx)} style={{ ...btn, position: 'absolute', top: 10, right: 10, padding: '2px 8px', fontSize: 11, color: '#c00', borderColor: '#c00' }}>✕</button>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Tela</label>
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="radio" name={`tela-${idx}`} checked={l.telaOrigen === 'CLIENTE'} onChange={() => actualizarLinea(idx, { telaOrigen: 'CLIENTE' })} />
                  Tela Cliente
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="radio" name={`tela-${idx}`} checked={l.telaOrigen === 'HYPE'} onChange={() => actualizarLinea(idx, { telaOrigen: 'HYPE' })} />
                  Tela HYPE
                </label>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Diseño *</label>
                <input value={l.diseno} onChange={(e) => actualizarLinea(idx, { diseno: e.target.value })} style={inp} />
              </div>
              <div>
                <label style={lbl}>Cantidad (mts) *</label>
                <input type="number" value={l.cantidadMts} onChange={(e) => actualizarLinea(idx, { cantidadMts: e.target.value })} style={inp} />
              </div>
            </div>
            <div>
              <label style={lbl}>Observaciones</label>
              <textarea value={l.observaciones} onChange={(e) => actualizarLinea(idx, { observaciones: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          </div>
        ))}

        <button onClick={agregarLinea} style={{ ...btn, marginBottom: 24 }}>+ Agregar otro diseño</button>

        {error && <div style={{ color: '#c00', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <button
          onClick={intentarEnviar}
          disabled={enviando}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none', background: '#e85d2f', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          {enviando ? 'Enviando...' : 'Enviar pedido'}
        </button>
      </div>

      {mostrarAviso && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 460 }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Antes de enviar</div>
            <div style={{ fontSize: 14, color: '#333', lineHeight: 1.5, marginBottom: 20 }}>
              El plazo para enviar la tela, en caso de ser tuya, es de <b>72 hs</b>. Es importante que nos envíes el remito con nombre de marca/razón social y descripción, mts y cantidad de rollos por tipo de tela.
              <br /><br />
              <b>Si envías kg, obligatoriamente necesitamos el rinde.</b>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setMostrarAviso(false)} style={btn}>Cancelar</button>
              <button
                onClick={confirmarYEnviar}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#e85d2f', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Entendido, enviar pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
