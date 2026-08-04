-- Porcentaje de descuento comercial, cargado a mano por Comercial en
-- Administracion. Se guarda repetido en todas las lineas de la misma OT
-- (se actualiza junto para toda la OT de una), para que el descuento sea
-- por orden, no por linea suelta.
alter table ordenes_directa add column if not exists descuento_pct numeric;
