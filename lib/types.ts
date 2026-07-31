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
export const OPERARIOS_ENTREGA = ['Mati', 'Leo', 'Ciro', 'Lautaro', 'Tomás', 'Néstor', 'Cache', 'Ricky'];

// Turnos del Reporte diario (control de mts impresos por rollo, por equipo):
// T = turno día regular, S = turno día sábado, D = turno día domingo,
// F = turno día feriado. Cada letra tiene 3 turnos (1/2/3).
export const TURNOS_REPORTE = ['T1', 'T2', 'T3', 'S1', 'S2', 'S3', 'D1', 'D2', 'D3', 'F1', 'F2', 'F3'] as const;

// Reporte diario — Cibitex (preparación/fijado): tipo de proceso que se
// está registrando en esa fila. Los que arrancan con "PREP" no tienen
// un diseño puntual asociado (se hacen a nivel OT, antes de imprimir).
export const TIPOS_PROCESO_CIBITEX = ['PREP Y REENCANUTADO', 'PREP Y PRETRATADO', 'PLANCHADO', 'FIJADO', 'FIJ Y POSTRATADO'] as const;

// Catálogo fijo de telas "Stock TH" (telas propias de HYPE, no de un
// cliente en particular). Al escribir "HYPE" en el campo Tela de Nuevo
// Pedido aparece un desplegable con estas opciones para cargar rápido.
export const TELAS_HYPE_TH = [
  { id_hype: 'THD00066017OFW', descripcion: 'HYPE TUSSOR' },
  { id_hype: 'THS00066231BLA', descripcion: 'HYPE GABARDINA IMPERMEABLE' },
  { id_hype: 'THD00066164BLA', descripcion: 'HYPE BULL' },
  { id_hype: 'THD00066184BLA', descripcion: 'HYPE FRISA' },
  { id_hype: 'THD00066045BLA', descripcion: 'HYPE COTTON SLAB' },
  { id_hype: 'THD00066028OFW', descripcion: 'HYPE GASA' },
  { id_hype: 'THD00066029OFW', descripcion: 'HYPE LINO' },
  { id_hype: 'THD00066030BLA', descripcion: 'HYPE FIBRANA' },
  { id_hype: 'THD00066052BLA', descripcion: 'HYPE RUSTICO C/LYCRA' },
  { id_hype: 'THD00066011BLA', descripcion: 'HYPE RIBB' },
  { id_hype: 'THD00066012BLA', descripcion: 'HYPE GABARDINA 6 OZ' },
  { id_hype: 'THD00066044BLA', descripcion: 'HYPE VOILE' },
  { id_hype: 'THD00066182BLA', descripcion: 'HYPE ALGODON C/LYCRA' },
  { id_hype: 'THD00066001BLA', descripcion: 'HYPE JERSEY DE ALGODÓN 24/1' },
  { id_hype: 'THD00066019BLA', descripcion: 'HYPE POPLIN' },
];

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
  motivo_no_impreso: string | null;
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
  cliente_avisado: boolean;
  orden_manual: number | null;

  creado_por: string | null;
  created_at: string;
  updated_at: string;
}

// Muestras: tabla independiente de ordenes_directa. No se cargan desde
// Ingreso y Modif Pedidos — se agregan directamente en la solapa Muestras,
// fila por fila (mismo patrón manual que Reporte diario). Mismas columnas
// que Producción hasta Fecha fin, sin Prod ni los campos de entrega/anticipo.
export interface Muestra {
  id: number;
  fecha: string;
  equipo: string | null;
  nro_ot: string | null;
  cliente: string | null;
  diseno: string | null;
  mts_pedidos: number | null;
  tela: string | null;
  cod_tela: string | null;
  ubicacion: string | null;
  aprob: string;
  post: boolean;

  imp_operario: string | null;
  motivo_no_impreso: string | null;
  mts_impresos: number;
  fecha_impresion: string | null;

  fija_operario: string | null;
  fecha_fin: string | null;

  observaciones: string | null;
  orden_manual: number | null;

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

// Reporte diario: control exhaustivo de mts impresos por rollo y por turno,
// por equipo (Monalisa 32 / Monalisa 8 = impresión, Cibitex = preparación/
// fijado, en su propia pestaña). Es independiente de ordenes_directa (una
// misma OT puede tener varios rollos, incluso en distintos turnos).
export interface RolloReporte {
  id: number;
  equipo: string;
  fecha: string;
  turno: string | null;
  nro_ot: string | null;
  cliente: string | null;
  diseno: string | null;
  mts_imp_rollo: number | null;
  rollo_nro: string | null;
  tela: string | null;
  cod_tela: string | null;
  op_imp: string | null;
  novedades: string | null;
  // Cibitex (preparación/fijado): usa fecha/turno de arriba + estos campos.
  tipo_proceso: string | null;
  op_fij: string | null;
  mts_fij: number | null;
  nro_rollos_fij: string | null;
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

// Prioridad = orden de ingreso (empezando en 1), igual que la columna "N"
// de la planilla. Se agrupa por nro_ot (una OT con varios diseños se
// mueve siempre como bloque) y esos bloques se ordenan por orden_manual
// — el campo que se actualiza con las flechas ↑↓ de Producción. Si una
// OT todavía no tiene orden_manual asignado (no debería pasar, pero por
// las dudas), se usa el id más chico de sus renglones como respaldo.
// Dentro de cada OT, los diseños se numeran por id (orden real de carga).
export function calcularPrioridad(ordenes: OrdenDirecta[]): Map<number, number> {
  const porOt = new Map<string, OrdenDirecta[]>();
  ordenes.forEach((o) => {
    const arr = porOt.get(o.nro_ot) || [];
    arr.push(o);
    porOt.set(o.nro_ot, arr);
  });
  const grupos = Array.from(porOt.values()).sort((a, b) => {
    const oa = a[0].orden_manual ?? Math.min(...a.map((f) => f.id));
    const ob = b[0].orden_manual ?? Math.min(...b.map((f) => f.id));
    return oa - ob;
  });
  const mapa = new Map<number, number>();
  let n = 1;
  grupos.forEach((filas) => {
    [...filas].sort((a, b) => a.id - b.id).forEach((f) => mapa.set(f.id, n++));
  });
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
