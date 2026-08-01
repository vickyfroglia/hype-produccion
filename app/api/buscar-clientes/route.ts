import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Autocompletado de "Empresa / Razón Social" en el form público de pedido:
// busca coincidencias contra la base de Clientes del Stock, para que el
// nombre que quede cargado sea exactamente el mismo que ya usan ahí (ej.
// "GRISINO-OTHER" en vez de "GRISINO" a mano) — así el pedido se vincula
// bien con el cliente correcto una vez que se carga en Producción.
//
// Corre del lado del servidor con el Service Role a propósito: así nunca
// hace falta abrirle al público ninguna otra columna de la tabla clientes
// (contacto, teléfono, mail, etc.) — esta ruta solo devuelve nombres.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY.');
    return NextResponse.json({ clientes: [] });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ clientes: [] });

  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select('nombre')
    .ilike('nombre', `%${q}%`)
    .order('nombre')
    .limit(8);

  if (error) {
    console.error('Error buscando clientes para el autocompletado:', error);
    return NextResponse.json({ clientes: [] });
  }

  return NextResponse.json({ clientes: (data || []).map((c: any) => c.nombre) });
}
