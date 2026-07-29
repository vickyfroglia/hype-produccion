import { NextRequest } from 'next/server';
import { generarYEnviarReporte, fechaArgentina, formatFechaCorta } from '../../../lib/reporteMail';

// Reporte semanal de productividad por mail — se dispara todos los lunes a
// las 8:00 AM (hora Argentina) vía Vercel Cron (ver vercel.json). Cubre la
// semana completa anterior: de lunes 8am a lunes 8am (7 días, lunes a
// domingo).
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const fechaHasta = fechaArgentina(-1); // domingo (último día de la semana anterior)
  const fechaDesde = fechaArgentina(-7); // lunes de esa misma semana

  const rango = `${formatFechaCorta(fechaDesde)} al ${formatFechaCorta(fechaHasta)}`;

  return generarYEnviarReporte({
    req,
    fechaDesde,
    fechaHasta,
    tituloPrincipal: 'Reporte semanal de producción',
    subtitulo: `Semana del ${rango}`,
    asunto: `REPORTE SEMANAL — ${rango}`,
  });
}
