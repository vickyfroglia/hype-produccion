-- % de anticipo requerido, cargado a mano por Comercial en Administracion
-- (igual patron que descuento_pct, forma_pago y envio: se guarda repetido
-- en todas las lineas de la misma OT).
alter table ordenes_directa add column if not exists anticipo_pct numeric;
