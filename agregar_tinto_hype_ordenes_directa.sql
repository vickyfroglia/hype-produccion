-- Nueva columna Tinto Hype en Producción: kg que pasan por ese proceso.
-- Se muestra en la grilla de Producción entre "Fecha fin" y "Prep".
alter table ordenes_directa add column if not exists tinto_hype numeric;
