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

export interface StockDisponible {
  id_hype: string;
  tela: string;
  color: string | null;
  disponible: number;
}

// Busca en las tablas de Stock (ingresos/egresos) qué telas hay
// cargadas para un cliente puntual, y cuántos mts quedan disponibles
// de cada una (ingresos - egresos, agrupado por id_hype).
// Requiere que esta app esté conectada al mismo proyecto Supabase que Stock.
export async function stockPorCliente(cliente: string): Promise<StockDisponible[]> {
  const [{ data: ingresos, error: e1 }, { data: egresos, error: e2 }] = await Promise.all([
    supabase.from('ingresos').select('id_hype, tela, color, mts').ilike('cliente', cliente),
    supabase.from('egresos').select('id_hype, mts').ilike('cliente', cliente),
  ]);
  if (e1 || e2) {
    console.error('No se pudo consultar stock (¿esta app está conectada al mismo Supabase que Stock?)', e1 || e2);
    return [];
  }
  const mapa = new Map<string, StockDisponible>();
  (ingresos || []).forEach((i: any) => {
    const actual = mapa.get(i.id_hype) || { id_hype: i.id_hype, tela: i.tela, color: i.color, disponible: 0 };
    actual.disponible += Number(i.mts || 0);
    mapa.set(i.id_hype, actual);
  });
  (egresos || []).forEach((e: any) => {
    const actual = mapa.get(e.id_hype);
    if (actual) actual.disponible -= Number(e.mts || 0);
  });
  return Array.from(mapa.values()).sort((a, b) => a.tela.localeCompare(b.tela));
}
