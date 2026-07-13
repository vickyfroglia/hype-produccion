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
