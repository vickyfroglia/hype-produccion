-- Agrega el precio por metro lineal a cada pedido de Producción, para que
-- Administración/Comercial lo carguen a mano en la tabla "Pendientes de
-- anticipo" (formato $000000, guardado ya formateado como texto).
alter table ordenes_directa add column if not exists precio_mt text;
