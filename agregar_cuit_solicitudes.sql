-- Agrega el CUIT (opcional) a las solicitudes de pedido públicas.
alter table solicitudes_pedido add column if not exists cuit text;
