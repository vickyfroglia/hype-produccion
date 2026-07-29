import { NextRequest } from 'next/server';
import { generarYEnviarReporte, fechaArgentina, formatFechaLarga } from '../../../lib/reporteMail';

// Reporte diario de productividad por mail — se dispara todos los días a
// las 8:00 AM (hora Argentina) vía Vercel Cron (ver vercel.json). Manda los
// mts de ayer por operario (Monalisa 32/8) y de terminación (Cibitex).
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const fechaAyer = fechaArgentina(-1);

  return generarYEnviarReporte({
    req,
    fechaDesde: fechaAyer,
    fechaHasta: fechaAyer,
    tituloPrincipal: 'Reporte diario de producción',
    subtitulo: formatFechaLarga(fechaAyer),
    asunto: `REPORTE DIARIO — ${formatFechaLarga(fechaAyer)}`,
  });
}
