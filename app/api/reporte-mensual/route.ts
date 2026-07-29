import { NextRequest } from 'next/server';
import { generarYEnviarReporte, fechaArgentina, nombreMes } from '../../../lib/reporteMail';

// Reporte mensual de productividad por mail — se dispara el día 1 de cada
// mes a las 8:00 AM (hora Argentina) vía Vercel Cron (ver vercel.json).
// Cubre el mes calendario completo anterior: del 1er día 8am al último día
// del mes 8am (o sea, hasta el día 1 siguiente).
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const fechaHasta = fechaArgentina(-1); // último día del mes anterior (hoy es el día 1)
  const [anio, mes] = fechaHasta.split('-');
  const fechaDesde = `${anio}-${mes}-01`; // primer día de ese mismo mes

  const nombreCrudo = nombreMes(fechaHasta); // ej: "julio 2026"
  const nombreMesTitulo = nombreCrudo.charAt(0).toUpperCase() + nombreCrudo.slice(1);

  return generarYEnviarReporte({
    req,
    fechaDesde,
    fechaHasta,
    tituloPrincipal: 'Reporte mensual de producción',
    subtitulo: nombreMesTitulo,
    asunto: `REPORTE MENSUAL — ${nombreMesTitulo}`,
  });
}
