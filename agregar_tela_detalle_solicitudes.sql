-- Agrega el detalle puntual de la tela a cada línea de una solicitud de
-- pedido pública: qué tela específica envía el cliente (si eligió "Tela
-- Cliente") o cuál tela del catálogo HYPE eligió (si eligió "Tela HYPE").
alter table solicitudes_pedido_lineas add column if not exists tela_detalle text;
