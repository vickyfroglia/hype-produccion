'use client';
import { useEffect, useState } from 'react';
import { TELAS_HYPE_TH } from '../../lib/types';
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

// Estilos para la tabla de diseños (calcada del Excel: una fila por diseño).
const thTabla: React.CSSProperties = { padding: '8px 10px', fontSize: 11, textTransform: 'uppercase', color: '#666', textAlign: 'left', background: '#f5f5f5', border: '1px solid #e5e5e5', whiteSpace: 'nowrap' };
const tdTabla: React.CSSProperties = { padding: '6px 8px', border: '1px solid #e5e5e5', verticalAlign: 'top' };
const inpCelda: React.CSSProperties = { width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 };

interface LineaPedido {
  telaOrigen: 'CLIENTE' | 'HYPE' | '';
  telaDetalle: string;
  colorTela: string;
  diseno: string;
  cantidadMts: string;
  observaciones: string;
}

function lineaVacia(): LineaPedido {
  return { telaOrigen: '', telaDetalle: '', colorTela: '', diseno: '', cantidadMts: '', observaciones: '' };
}

export default function PedidoCliente() {
  const [tipoTrabajo, setTipoTrabajo] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [cuit, setCuit] = useState('');
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

  // Catálogo de colores del Stock (sigla + nombre) para que, si la tela es
  // del cliente, elija el color por nombre y quede guardado con la misma
  // sigla que usan en Stock. Si por algún motivo no carga (ej. falta la
  // política de lectura pública en Supabase), se cae a un campo de texto
  // libre más abajo.
  const [colores, setColores] = useState<{ sigla: string; nombre: string }[]>([]);
  useEffect(() => {
    supabase
      .from('colores')
      .select('sigla, nombre')
      .order('nombre')
      .then(({ data, error }) => {
        if (error) {
          console.error('No se pudo cargar el catálogo de colores (¿falta la política de lectura pública?):', error);
          return;
        }
        setColores(data || []);
      });
  }, []);

  // Catálogo de telas del Stock (cod + nombre) para que, si la tela es del
  // cliente, elija el nombre tal como está cargado en Stock (base de
  // datos / telas), en vez de escribirlo a mano. Mismo fallback a texto
  // libre si no carga.
  const [telasCatalogo, setTelasCatalogo] = useState<{ cod: string; nombre: string }[]>([]);
  useEffect(() => {
    supabase
      .from('telas')
      .select('cod, nombre')
      .order('nombre')
      .then(({ data, error }) => {
        if (error) {
          console.error('No se pudo cargar el catálogo de telas (¿falta la política de lectura pública?):', error);
          return;
        }
        setTelasCatalogo(data || []);
      });
  }, []);

  // Va formateando el CUIT a medida que lo escriben: se queda solo con los
  // números que tipeen (hasta 11) y les pone los guiones en su lugar, para
  // que termine como XX-XXXXXXXX-X sin que el cliente tenga que escribir
  // los guiones a mano.
  function formatearCuit(valor: string): string {
    const digitos = valor.replace(/\D/g, '').slice(0, 11);
    if (digitos.length <= 2) return digitos;
    if (digitos.length <= 10) return `${digitos.slice(0, 2)}-${digitos.slice(2)}`;
    return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
  }

  function actualizarLinea(idx: number, cambios: Partial<LineaPedido>) {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...cambios } : l)));
  }
  function agregarLinea() {
    setLineas((prev) => [...prev, lineaVacia()]);
  }
  function quitarLinea(idx: number) {
    setLineas((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  // Chequeo simple de formato de mail — no hace falta nada más estricto,
  // solo evitar que quede vacío o directamente mal escrito.
  function mailValido(valor: string): boolean {
    return /\S+@\S+\.\S+/.test(valor.trim());
  }

  // Valida los datos y, si está todo bien, muestra el aviso del plazo de
  // 72hs antes de mandar el pedido de verdad.
  function lineaCompleta(l: LineaPedido): boolean {
    return !!(l.diseno.trim() && parseFloat(l.cantidadMts) && l.telaOrigen && l.telaDetalle.trim());
  }

  function intentarEnviar() {
    const lineasValidas = lineas.filter(lineaCompleta);
    if (!empresa.trim() || lineasValidas.length === 0) {
      setError('Completá al menos Empresa / Razón Social y un diseño con su tela, tela específica y cantidad de mts.');
      return;
    }
    if (!mailValido(email)) {
      setError('Completá un mail válido — lo necesitamos para confirmarte la recepción del pedido.');
      return;
    }
    setError('');
    setMostrarAviso(true);
  }

  async function confirmarYEnviar() {
    const lineasValidas = lineas.filter(lineaCompleta);
    setMostrarAviso(false);
    setEnviando(true);

    try {
      const resp = await fetch('/api/confirmar-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoTrabajo: tipoTrabajo || null,
          empresa: empresa.trim(),
          cuit: cuit.trim() || null,
          contacto: contacto.trim() || null,
          telefono: telefono.trim() || null,
          email: email.trim(),
          direccion: direccion.trim() || null,
          cp: cp.trim() || null,
          provincia: provincia.trim() || null,
          lineas: lineasValidas.map((l) => ({
            telaOrigen: l.telaOrigen || null,
            telaDetalle: l.telaDetalle.trim() || null,
            colorTela: l.telaOrigen === 'CLIENTE' ? l.colorTela.trim() || null : null,
            diseno: l.diseno.trim(),
            cantidadMts: parseFloat(l.cantidadMts) || 0,
            observaciones: l.observaciones.trim() || null,
          })),
        }),
      });
      const data = await resp.json();
      setEnviando(false);
      if (!resp.ok) {
        setError(data.error || 'No se pudo enviar el pedido. Probá de nuevo en unos minutos.');
        return;
      }
      setEnviado(true);
    } catch (err) {
      setEnviando(false);
      setError('No se pudo enviar el pedido. Probá de nuevo en unos minutos.');
      console.error(err);
    }
  }

  if (enviado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 420, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>¡Pedido enviado!</div>
          <div style={{ fontSize: 14, color: '#666' }}>Lo recibimos y lo vamos a revisar antes de cargarlo en producción. Te mandamos un mail de confirmación. Gracias.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', padding: '40px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ background: '#ffdcb3', color: '#000', padding: '24px 32px 20px' }}>
          <img src="/logo.png" alt="HYPE printlab" style={{ height: 40, marginBottom: 8 }} />
          <div style={{ fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#000' }}>Form de pedido</div>
        </div>
        <div style={{ padding: 32 }}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
          Fecha: {new Date().toLocaleDateString('es-AR')} (automática — el pedido ingresa una vez que el form se encuentra confirmado)
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
          ¡Porfa! Completá todos los datos de tu pedido, ya que de esto depende que el pedido salga bien — es importante para nosotros. Y quedate tranquilo que lo vamos a revisar antes de confirmarlo: si por alguna razón hay algo mal, nos vamos a contactar para resolverlo.
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Tipo de trabajo <span style={{ fontWeight: 400, color: '#888' }}>(depende si la tela es algodón/lino, fibra natural o poliéster)</span></label>
          <select value={tipoTrabajo} onChange={(e) => setTipoTrabajo(e.target.value)} style={inp}>
            <option value="">—</option>
            {TIPOS_TRABAJO.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Empresa / Marca y Razón Social * <span style={{ fontWeight: 400, color: '#888' }}>(a quién va facturado, quien abona)</span></label>
            <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>CUIT <span style={{ fontWeight: 400, color: '#888' }}>(si es necesario)</span></label>
            <input
              value={cuit}
              onChange={(e) => setCuit(formatearCuit(e.target.value))}
              placeholder="XX-XXXXXXXX-X"
              inputMode="numeric"
              style={inp}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Contacto <span style={{ fontWeight: 400, color: '#888' }}>(nombre de quien solicita)</span></label>
            <input value={contacto} onChange={(e) => setContacto(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Teléfono <span style={{ fontWeight: 400, color: '#888' }}>(así te contactamos de ser necesario)</span></label>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} style={inp} />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>E-mail * <span style={{ fontWeight: 400, color: '#888' }}>(te confirmamos la recepción del pedido a esta dirección)</span></label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
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

        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Diseños</div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
          Por cada diseño indicá si la tela la envías vos o es tela HYPE, y elegí/escribí cuál puntualmente.
        </div>

        <div style={{ overflowX: 'auto', marginBottom: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 840 }}>
            <thead>
              <tr>
                <th style={{ ...thTabla, width: 130 }}>Tela</th>
                <th style={{ ...thTabla, width: 190 }}>Tela específica *</th>
                <th style={{ ...thTabla, width: 120 }}>Color tela</th>
                <th style={thTabla}>Diseño *</th>
                <th style={{ ...thTabla, width: 100 }}>Cant. (mts) *</th>
                <th style={thTabla}>Observaciones</th>
                <th style={{ ...thTabla, width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, idx) => (
                <tr key={idx}>
                  <td style={tdTabla}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, marginBottom: 4 }}>
                      <input
                        type="radio"
                        name={`tela-${idx}`}
                        checked={l.telaOrigen === 'CLIENTE'}
                        onChange={() => actualizarLinea(idx, { telaOrigen: 'CLIENTE', telaDetalle: '' })}
                      />
                      Tela Cliente
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <input
                        type="radio"
                        name={`tela-${idx}`}
                        checked={l.telaOrigen === 'HYPE'}
                        onChange={() => actualizarLinea(idx, { telaOrigen: 'HYPE', telaDetalle: '', colorTela: '' })}
                      />
                      Tela HYPE
                    </label>
                  </td>
                  <td style={tdTabla}>
                    {l.telaOrigen === 'HYPE' ? (
                      <select value={l.telaDetalle} onChange={(e) => actualizarLinea(idx, { telaDetalle: e.target.value })} style={inpCelda}>
                        <option value="">Elegir tela HYPE...</option>
                        {TELAS_HYPE_TH.map((t) => (
                          <option key={t.id_hype} value={t.descripcion}>{t.descripcion}</option>
                        ))}
                      </select>
                    ) : l.telaOrigen === 'CLIENTE' && telasCatalogo.length > 0 ? (
                      <select value={l.telaDetalle} onChange={(e) => actualizarLinea(idx, { telaDetalle: e.target.value })} style={inpCelda}>
                        <option value="">Elegir tela...</option>
                        {telasCatalogo.map((t) => (
                          <option key={t.cod} value={t.nombre}>{t.nombre}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={l.telaDetalle}
                        onChange={(e) => actualizarLinea(idx, { telaDetalle: e.target.value })}
                        placeholder={l.telaOrigen === 'CLIENTE' ? 'Ej: jersey algodón 24/1' : 'Elegí Tela Cliente o Tela HYPE'}
                        disabled={!l.telaOrigen}
                        style={inpCelda}
                      />
                    )}
                  </td>
                  <td style={tdTabla}>
                    {l.telaOrigen !== 'CLIENTE' ? (
                      <input value="" disabled placeholder="—" style={{ ...inpCelda, background: '#f5f5f5', color: '#aaa' }} />
                    ) : colores.length > 0 ? (
                      <select value={l.colorTela} onChange={(e) => actualizarLinea(idx, { colorTela: e.target.value })} style={inpCelda}>
                        <option value="">Elegir color...</option>
                        {colores.map((c) => (
                          <option key={c.sigla} value={c.sigla}>{c.nombre}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={l.colorTela}
                        onChange={(e) => actualizarLinea(idx, { colorTela: e.target.value })}
                        placeholder="Ej: blanco"
                        style={inpCelda}
                      />
                    )}
                  </td>
                  <td style={tdTabla}>
                    <input value={l.diseno} onChange={(e) => actualizarLinea(idx, { diseno: e.target.value })} style={inpCelda} />
                  </td>
                  <td style={tdTabla}>
                    <input type="number" value={l.cantidadMts} onChange={(e) => actualizarLinea(idx, { cantidadMts: e.target.value })} style={inpCelda} />
                  </td>
                  <td style={tdTabla}>
                    <input value={l.observaciones} onChange={(e) => actualizarLinea(idx, { observaciones: e.target.value })} style={inpCelda} />
                  </td>
                  <td style={{ ...tdTabla, textAlign: 'center' }}>
                    {lineas.length > 1 && (
                      <button onClick={() => quitarLinea(idx)} style={{ ...btn, padding: '2px 6px', fontSize: 11, color: '#c00', borderColor: '#c00' }}>✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
      </div>

      {mostrarAviso && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 460 }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Antes de enviar</div>
            <div style={{ fontSize: 14, color: '#333', lineHeight: 1.5, marginBottom: 20 }}>
              El plazo para enviar la tela, en caso de ser tuya, es de <b>72 hs</b>. Es importante que nos envíes el remito con nombre de marca/razón social y descripción, mts y cantidad de rollos por tipo de tela.
              <br /><br />
              <b>Si envías kg, obligatoriamente necesitamos el rinde.</b>
              <br /><br />
              <b style={{ textTransform: 'uppercase' }}>Aguardá la confirmación del mismo por mail!! :)</b>
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
