-- Guarda qué Nro OT quedó asignado a cada solicitud de pedido cuando se
-- carga automáticamente en Producción (para poder rastrearla después si
-- hace falta, aunque ya haya salido de la lista de pendientes).
alter table solicitudes_pedido add column if not exists nro_ot_asignado text;
