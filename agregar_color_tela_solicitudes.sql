-- Agrega el color de la tela a cada línea de una solicitud de pedido
-- pública. Solo tiene sentido cuando la tela es del cliente (tela_origen =
-- 'CLIENTE'); para tela HYPE el form la deja vacía porque el color no lo
-- elige el cliente.
alter table solicitudes_pedido_lineas add column if not exists color_tela text;
