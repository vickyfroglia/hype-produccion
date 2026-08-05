-- Costo de envío por OT, cargado a mano en pesos. Se guarda repetido en
-- todas las lineas de esa OT, igual que descuento_pct y forma_pago.
alter table ordenes_directa add column if not exists envio numeric;
