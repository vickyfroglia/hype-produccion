-- Forma de pago por OT (Sin cargo / Cuenta Recaudadora +3,5% / IVA +21%),
-- se guarda repetida en todas las lineas de esa OT igual que el descuento.
alter table ordenes_directa add column if not exists forma_pago text;
