import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Trae TODAS las filas de una tabla, sin el límite de 1000 filas
// que impone Supabase por default. Mismo patrón que en la app de Stock.
export async function fetchAll(table: string, orderBy: string, ascending = false) {
  let all: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('Error cargando', table, error);
      break;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// Interruptor de la conexion con la app de Stock. En false, esta app NO lee
// ni escribe ingresos/egresos del Stock (no reserva tela, no descuenta, no
// replica remitos ni consulta telas disponibles). Para reactivar la
// integracion mas adelante basta con ponerlo en true.
export const STOCK_CONECTADO = false;

// Consulta "vacia" que acepta cualquier encadenado (insert/update/delete/eq...)
// y resuelve sin error ni datos, sin tocar la base. Reemplaza a
// supabase.from('egresos') mientras STOCK_CONECTADO sea false.
function consultaVacia(): any {
  const resultado = { data: null, error: null };
  const q: any = new Proxy(function () {}, {
    get: (_t, prop) => (prop === 'then' ? (f: any, r: any) => Promise.resolve(resultado).then(f, r) : () => q),
    apply: () => q,
  });
  return q;
}

export function egresosDb(): any {
  return STOCK_CONECTADO ? supabase.from('egresos') : consultaVacia();
}

// Trae SOLO los pedidos "abiertos": los que todavia no tienen cargado el
// campo "entrego" (nadie los entrego aun). Los entregados no se descargan
// al abrir la app (es lo que la hacia pesada); se buscan en la base cuando
// se necesitan, con buscarOrdenesEntregadas().
export async function fetchOrdenesAbiertas() {
  let all: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('ordenes_directa')
      .select('*')
      .or('entrego.is.null,entrego.eq.')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('Error cargando pedidos abiertos', error);
      break;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// Solo las columnas minimas de TODOS los pedidos (abiertos y entregados),
// para los totales del Dashboard (mts del año / del mes / por equipo)
// sin tener que descargar los pedidos completos.
export async function fetchOrdenesParaTotales() {
  let all: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('ordenes_directa')
      .select('id, nro_ot, cliente, diseno, equipo, fecha, mts_impresos, mts_pedidos')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('Error cargando totales de pedidos', error);
      break;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// Busca pedidos YA ENTREGADOS (campo "entrego" completo) directamente en la
// base, por Nro OT, cliente, diseño o tela. Sin texto devuelve los mas
// recientes. Tope de 300 resultados para que la pantalla siga liviana.
export async function buscarOrdenesEntregadas(texto: string, limite = 300) {
  const t = texto.trim().replace(/[,()%*]/g, ' ').trim();
  let q = supabase.from('ordenes_directa').select('*').not('entrego', 'is', null).neq('entrego', '');
  if (t) {
    const like = `%${t}%`;
    q = q.or(`nro_ot.ilike.${like},cliente.ilike.${like},diseno.ilike.${like},tela.ilike.${like}`);
  }
  const { data, error } = await q.order('fecha', { ascending: false }).order('id', { ascending: false }).limit(limite);
  if (error) {
    console.error('Error buscando pedidos entregados', error);
    return [];
  }
  return data || [];
}

export interface StockDisponible {
  id_hype: string;
  tela: string;
  color: string | null;
  ubicacion: string | null;
  disponible: number;
  remitos: string[];
  observaciones: string[];
}

// Busca en las tablas de Stock (ingresos/egresos) qué telas hay
// cargadas para un cliente puntual, y cuántos mts quedan disponibles
// de cada una (ingresos - egresos, agrupado por id_hype). Junta también
// los nº de remito y observaciones de cada ingreso, para dar más contexto
// al elegir la tela (puede haber más de un ingreso para el mismo id_hype).
// Requiere que esta app esté conectada al mismo proyecto Supabase que Stock.
export async function stockPorCliente(cliente: string): Promise<StockDisponible[]> {
  if (!STOCK_CONECTADO) return [];
  const [{ data: ingresos, error: e1 }, { data: egresos, error: e2 }] = await Promise.all([
    supabase.from('ingresos').select('id_hype, tela, color, ubicacion, mts, remito, observaciones').ilike('cliente', cliente),
    supabase.from('egresos').select('id_hype, mts').ilike('cliente', cliente),
  ]);
  if (e1 || e2) {
    console.error('No se pudo consultar stock (¿esta app está conectada al mismo Supabase que Stock?)', e1 || e2);
    return [];
  }
  const mapa = new Map<string, StockDisponible>();
  (ingresos || []).forEach((i: any) => {
    const actual = mapa.get(i.id_hype) || { id_hype: i.id_hype, tela: i.tela, color: i.color, ubicacion: i.ubicacion, disponible: 0, remitos: [], observaciones: [] };
    actual.disponible += Number(i.mts || 0);
    if (i.remito && !actual.remitos.includes(String(i.remito))) actual.remitos.push(String(i.remito));
    if (i.observaciones && !actual.observaciones.includes(i.observaciones)) actual.observaciones.push(i.observaciones);
    mapa.set(i.id_hype, actual);
  });
  (egresos || []).forEach((e: any) => {
    const actual = mapa.get(e.id_hype);
    if (actual) actual.disponible -= Number(e.mts || 0);
  });
  return Array.from(mapa.values()).sort((a, b) => a.tela.localeCompare(b.tela));
}

// Catálogo de telas "Stock TH": son códigos (id_hype que arrancan con "TH")
// de telas propias de HYPE, no asignadas a ningún cliente en particular.
// Cualquier pedido puede usarlas aunque el nombre del cliente no coincida,
// así que se buscan por id_hype en vez de por cliente.
export async function stockTH(): Promise<StockDisponible[]> {
  if (!STOCK_CONECTADO) return [];
  const [{ data: ingresos, error: e1 }, { data: egresos, error: e2 }] = await Promise.all([
    supabase.from('ingresos').select('id_hype, tela, color, ubicacion, mts, remito, observaciones').ilike('id_hype', 'TH%'),
    supabase.from('egresos').select('id_hype, mts').ilike('id_hype', 'TH%'),
  ]);
  if (e1 || e2) {
    console.error('No se pudo consultar el stock TH', e1 || e2);
    return [];
  }
  const mapa = new Map<string, StockDisponible>();
  (ingresos || []).forEach((i: any) => {
    const actual = mapa.get(i.id_hype) || { id_hype: i.id_hype, tela: i.tela, color: i.color, ubicacion: i.ubicacion, disponible: 0, remitos: [], observaciones: [] };
    actual.disponible += Number(i.mts || 0);
    if (i.remito && !actual.remitos.includes(String(i.remito))) actual.remitos.push(String(i.remito));
    if (i.observaciones && !actual.observaciones.includes(i.observaciones)) actual.observaciones.push(i.observaciones);
    mapa.set(i.id_hype, actual);
  });
  (egresos || []).forEach((e: any) => {
    const actual = mapa.get(e.id_hype);
    if (actual) actual.disponible -= Number(e.mts || 0);
  });
  return Array.from(mapa.values()).sort((a, b) => a.tela.localeCompare(b.tela));
}
