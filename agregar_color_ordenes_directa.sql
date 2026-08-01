-- Agrega el color de la tela a cada pedido de Producción, para mostrarlo
-- junto con la tela en la columna "Tela / Color" de Vista General.
alter table ordenes_directa add column if not exists color text;
