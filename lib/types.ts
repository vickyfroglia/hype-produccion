export const EQUIPOS = ['Monalisa 32', 'Monalisa 8'] as const;
export const PERFILES = ['2 pasadas', '3 pasadas'] as const;
export const TIPOS_OT = ['OT', 'OP', 'REPO', 'OI'] as const;
export const APROB_OPCIONES = ['FICHAR CN', 'FICHAR CR', 'EN PROCESO', 'C APROB', 'S APROB'] as const;
export const ANTICIPO_OPCIONES = ['PAGADO', 'PENDIENTE', 'N/A'] as const;
export const TIPO_RTO_OPCIONES = ['OFICIAL', 'NO OFICIAL'] as const;
export const ESTADO_ENTREGA_OPCIONES = ['En almacén', 'Entregado a cliente', 'Entregado a transportista'] as const;

// Operarios habilitados por paso (si no tenés una tabla `empleados` filtrable
// por área, se usa esta lista fija — fácil de editar acá).
export const OPERARIOS_IMPRESION = ['Tomás', 'Néstor', 'Cache', 'Ricky'];
export const OPERARIOS_FIJACION = ['Mati', 'Leo', 'Ciro', 'Lautaro'];

export interface OrdenDirecta {
  id: number;
  nro_ot: string;
  fecha: string;
  equipo: string | null;
  perfil: string | null;
  tipo_ot: string | null;
  cliente: string;
  diseno: string;
  mts_pedidos: number;
  tela: string | null;
  cod_tela: string | null;
  aprob: string;
  post: boolean;

  anticipo: string;
  entregar: boolean | null;
  tipo_rto: string | null;

  imp_operario: string | null;
  mts_impresos: number;
  fecha_impresion: string | null;

  prep: boolean;
  fija_operario: string | null;
  fecha_fin: string | null;
  nro_rto: string | null;
  bulto_actual: number | null;
  bulto_total: number | null;
  estado_entrega: string;
  entrego: string | null;
  recibio: string | null;
  fecha_entrega: string | null;

  observaciones: string | null;
  puede_producir: boolean;

  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventoDirecta {
  id: number;
  orden_id: number;
  evento: string;
  detalle: string | null;
  created_at: string;
}

export function faltaParaProducir(o: OrdenDirecta): string[] {
  const falta: string[] = [];
  if (o.anticipo === 'PENDIENTE') falta.push('anticipo');
  if (!['C APROB', 'S APROB'].includes(o.aprob)) falta.push('aprobación');
  if (!o.prep) falta.push('tela preparada');
  return falta;
}

export function estaAtrasada(o: OrdenDirecta): boolean {
  if (o.estado_entrega !== 'En almacén') return false;
  if (!o.fecha_fin) return false;
  // más de 3 días fijado y sin salir de almacén: bandera de atraso simple.
  const dias = (Date.now() - new Date(o.fecha_fin).getTime()) / 86400000;
  return dias > 3;
}

export function pctAvance(o: OrdenDirecta): number {
  if (!o.mts_pedidos) return 0;
  return Math.min(100, Math.round((o.mts_impresos / o.mts_pedidos) * 100));
}

// Prioridad = orden de ingreso por fecha creciente (empezando en 1),
// igual que la columna "N" de la planilla. Se calcula sobre TODOS los
// pedidos (no solo los filtrados/buscados) para que el número de cada
// OT no cambie según qué se esté mostrando en pantalla.
export function calcularPrioridad(ordenes: OrdenDirecta[]): Map<number, number> {
  const ordenados = [...ordenes].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    return a.created_at.localeCompare(b.created_at);
  });
  const mapa = new Map<number, number>();
  ordenados.forEach((o, i) => mapa.set(o.id, i + 1));
  return mapa;
}

// Formatea una fecha 'YYYY-MM-DD' (o timestamp ISO) como 'DD/MM/AA'.
export function formatFecha(fecha: string | null): string {
  if (!fecha) return '—';
  const soloFecha = fecha.split('T')[0];
  const [y, m, d] = soloFecha.split('-');
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y.slice(2)}`;
}
