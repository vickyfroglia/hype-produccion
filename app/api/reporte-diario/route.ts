import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// Reporte diario de productividad por mail — se dispara todos los días a las
// 8:00 AM (hora Argentina) vía Vercel Cron (ver vercel.json), y manda un mail
// con los mts impresos de ayer por operario (Monalisa 32 / Monalisa 8) y los
// mts de terminación de ayer por operario, agrupados en Fijado / Preparación.
//
// Usa el Service Role de Supabase (no el anon key) porque este endpoint corre
// sin un usuario logueado, y las políticas RLS de reporte_rollos exigen
// auth.role() = 'authenticated'. El Service Role se salta RLS — por eso NUNCA
// debe tener el prefijo NEXT_PUBLIC_ (si lo tuviera, quedaría expuesto al
// navegador).
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic';

const OFFSET_ART_MS = 3 * 60 * 60 * 1000; // Argentina = UTC-3 todo el año (sin horario de verano)

const GRUPO_FIJADO = ['FIJADO', 'FIJ Y POSTRATADO'];
const GRUPO_PREP_PLANCHADO = ['PREP Y PRETRATADO', 'PLANCHADO', 'PREP Y REENCANUTADO'];

// Fecha (YYYY-MM-DD) del día anterior, calculada en hora Argentina — así el
// cron corre en UTC (Vercel) pero el reporte siempre habla del "día de
// trabajo" de ayer visto desde acá, sin depender de en qué huso horario
// corra el servidor.
function fechaAyerArgentina(): string {
  const ahoraArt = new Date(Date.now() - OFFSET_ART_MS);
  ahoraArt.setUTCDate(ahoraArt.getUTCDate() - 1);
  return ahoraArt.toISOString().split('T')[0];
}

function formatFechaLarga(fechaIso: string): string {
  const [y, m, d] = fechaIso.split('-');
  return `${d}/${m}/${y}`;
}

interface FilaRollo {
  equipo: string;
  op_imp: string | null;
  mts_imp_rollo: number | null;
  op_fij: string | null;
  mts_fij: number | null;
  tipo_proceso: string | null;
}

// Suma mts por operario para un equipo de impresión puntual (Monalisa 32/8),
// ordenado de mayor a menor para que se vea primero quien más produjo.
function totalesImpresionPorOperario(filas: FilaRollo[], equipo: string): { operario: string; mts: number }[] {
  const mapa = new Map<string, number>();
  filas
    .filter((r) => r.equipo === equipo && r.op_imp)
    .forEach((r) => {
      const operario = r.op_imp as string;
      mapa.set(operario, (mapa.get(operario) || 0) + Number(r.mts_imp_rollo || 0));
    });
  return Array.from(mapa.entries())
    .map(([operario, mts]) => ({ operario, mts }))
    .sort((a, b) => b.mts - a.mts);
}

// Suma mts de Cibitex por operario, separados en dos grupos: Fijado
// (FIJADO + FIJ Y POSTRATADO) y Preparación (PREP Y REENCANUTADO + PREP Y
// PRETRATADO + PLANCHADO).
function totalesTerminacionPorOperario(filas: FilaRollo[]): { operario: string; fijado: number; prep: number }[] {
  const mapa = new Map<string, { fijado: number; prep: number }>();
  filas
    .filter((r) => r.equipo === 'Cibitex' && r.op_fij)
    .forEach((r) => {
      const operario = r.op_fij as string;
      const actual = mapa.get(operario) || { fijado: 0, prep: 0 };
      const mts = Number(r.mts_fij || 0);
      if (GRUPO_FIJADO.includes(r.tipo_proceso || '')) actual.fijado += mts;
      if (GRUPO_PREP_PLANCHADO.includes(r.tipo_proceso || '')) actual.prep += mts;
      mapa.set(operario, actual);
    });
  return Array.from(mapa.entries())
    .map(([operario, v]) => ({ operario, fijado: v.fijado, prep: v.prep }))
    .sort((a, b) => b.fijado + b.prep - (a.fijado + a.prep));
}

function sumar(campo: 'mts', filas: { mts: number }[]): number {
  return filas.reduce((s, f) => s + f[campo], 0);
}

// --- Armado del HTML del mail, con la misma paleta de colores que la app ---
// #1a1a2e = header oscuro | #e85d2f = acento naranja | #fbe0c8 = pastel
// naranja (impresión) | #e6dcf7 = pastel lila (terminación).
function armarHtml(fechaIso: string, mona32: { operario: string; mts: number }[], mona8: { operario: string; mts: number }[], term: { operario: string; fijado: number; prep: number }[]): string {
  const totalMona32 = sumar('mts', mona32);
  const totalMona8 = sumar('mts', mona8);
  const totalFijado = term.reduce((s, t) => s + t.fijado, 0);
  const totalPrep = term.reduce((s, t) => s + t.prep, 0);

  const filaImpresion = (r: { operario: string; mts: number }) => `
    <tr>
      <td style="padding:8px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#000;">${r.operario}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#000;font-weight:700;text-align:right;">${r.mts.toLocaleString('es-AR')}</td>
    </tr>`;

  const tablaImpresion = (titulo: string, filas: { operario: string; mts: number }[], total: number) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;border:1px solid #eee;border-radius:8px;overflow:hidden;">
      <tr>
        <td colspan="2" style="background:#fbe0c8;color:#000;font-weight:700;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:10px 14px;">
          ${titulo}
        </td>
      </tr>
      <tr>
        <th style="text-align:left;padding:6px 14px;font-size:11px;color:#888;border-bottom:1px solid #eee;">Operario</th>
        <th style="text-align:right;padding:6px 14px;font-size:11px;color:#888;border-bottom:1px solid #eee;">Mts impresos</th>
      </tr>
      ${filas.length > 0 ? filas.map(filaImpresion).join('') : '<tr><td colspan="2" style="padding:10px 14px;font-size:13px;color:#888;text-align:center;">Sin datos cargados</td></tr>'}
      <tr>
        <td style="padding:8px 14px;font-size:13px;font-weight:700;color:#000;border-top:2px solid #000;">TOTAL</td>
        <td style="padding:8px 14px;font-size:13px;font-weight:700;color:#000;text-align:right;border-top:2px solid #000;">${total.toLocaleString('es-AR')}</td>
      </tr>
    </table>`;

  const filaTerminacion = (r: { operario: string; fijado: number; prep: number }) => `
    <tr>
      <td style="padding:8px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#000;">${r.operario}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#000;font-weight:700;text-align:right;">${r.fijado.toLocaleString('es-AR')}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#000;font-weight:700;text-align:right;">${r.prep.toLocaleString('es-AR')}</td>
    </tr>`;

  const tablaTerminacion = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;border:1px solid #eee;border-radius:8px;overflow:hidden;">
      <tr>
        <td colspan="3" style="background:#e6dcf7;color:#000;font-weight:700;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;padding:10px 14px;">
          Terminación — Cibitex
        </td>
      </tr>
      <tr>
        <th style="text-align:left;padding:6px 14px;font-size:11px;color:#888;border-bottom:1px solid #eee;">Operario</th>
        <th style="text-align:right;padding:6px 14px;font-size:11px;color:#888;border-bottom:1px solid #eee;">Fijado (mts.)</th>
        <th style="text-align:right;padding:6px 14px;font-size:11px;color:#888;border-bottom:1px solid #eee;">Preparación (mts.)</th>
      </tr>
      ${term.length > 0 ? term.map(filaTerminacion).join('') : '<tr><td colspan="3" style="padding:10px 14px;font-size:13px;color:#888;text-align:center;">Sin datos cargados</td></tr>'}
      <tr>
        <td style="padding:8px 14px;font-size:13px;font-weight:700;color:#000;border-top:2px solid #000;">TOTAL</td>
        <td style="padding:8px 14px;font-size:13px;font-weight:700;color:#000;text-align:right;border-top:2px solid #000;">${totalFijado.toLocaleString('es-AR')}</td>
        <td style="padding:8px 14px;font-size:13px;font-weight:700;color:#000;text-align:right;border-top:2px solid #000;">${totalPrep.toLocaleString('es-AR')}</td>
      </tr>
    </table>`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#1a1a2e;color:#ffffff;padding:20px 24px;border-radius:8px 8px 0 0;">
      <div style="font-size:11px;letter-spacing:2px;color:#e85d2f;font-weight:700;text-transform:uppercase;">HYPE PRINTLAB</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px;">Reporte diario de producción</div>
      <div style="font-size:13px;color:#cfcfe0;margin-top:2px;">${formatFechaLarga(fechaIso)}</div>
    </div>
    <div style="padding:22px 20px;background:#fdfbf5;border:1px solid #eee;border-top:none;">
      <div style="display:flex;gap:12px;margin-bottom:22px;">
        <table role="presentation" width="100%"><tr>
          <td style="width:50%;padding-right:6px;">
            <div style="background:#1a1a2e;color:#fff;border-radius:8px;padding:14px;text-align:center;">
              <div style="font-size:11px;letter-spacing:0.5px;text-transform:uppercase;">Mts totales impresos</div>
              <div style="font-size:26px;font-weight:700;margin-top:4px;">${(totalMona32 + totalMona8).toLocaleString('es-AR')}</div>
            </div>
          </td>
          <td style="width:50%;padding-left:6px;">
            <div style="background:#1a1a2e;color:#fff;border-radius:8px;padding:14px;text-align:center;">
              <div style="font-size:11px;letter-spacing:0.5px;text-transform:uppercase;">Mts totales fijados</div>
              <div style="font-size:26px;font-weight:700;margin-top:4px;">${totalFijado.toLocaleString('es-AR')}</div>
            </div>
          </td>
        </tr></table>
      </div>

      ${tablaImpresion('Impresión — Monalisa 32', mona32, totalMona32)}
      ${tablaImpresion('Impresión — Monalisa 8', mona8, totalMona8)}
      ${tablaTerminacion}

      <div style="font-size:11px;color:#999;margin-top:6px;">
        Reporte generado automáticamente a partir de Reporte diario (mts de ${formatFechaLarga(fechaIso)}).
      </div>
    </div>
  </div>`;
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Faltan variables de entorno de Supabase (SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 });
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const fechaAyer = fechaAyerArgentina();

  const { data, error } = await supabaseAdmin
    .from('reporte_rollos')
    .select('equipo, op_imp, mts_imp_rollo, op_fij, mts_fij, tipo_proceso')
    .eq('fecha', fechaAyer);

  if (error) {
    return NextResponse.json({ error: 'Error consultando reporte_rollos: ' + error.message }, { status: 500 });
  }

  const filas = (data || []) as FilaRollo[];
  const mona32 = totalesImpresionPorOperario(filas, 'Monalisa 32');
  const mona8 = totalesImpresionPorOperario(filas, 'Monalisa 8');
  const term = totalesTerminacionPorOperario(filas);

  const html = armarHtml(fechaAyer, mona32, mona8, term);

  const destinatarios = (process.env.REPORTE_DESTINATARIOS || 'matias@hypearg.com')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ error: 'Faltan variables de entorno GMAIL_USER / GMAIL_APP_PASSWORD' }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `"HYPE Printlab — Reporte diario" <${process.env.GMAIL_USER}>`,
      to: destinatarios,
      subject: `Reporte diario de producción — ${formatFechaLarga(fechaAyer)}`,
      html,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error enviando el mail: ' + (err?.message || String(err)) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fecha: fechaAyer, destinatarios });
}
