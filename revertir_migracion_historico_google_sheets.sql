-- Revierte la migración histórica de PRODUCCION 2026 (Google Sheets) que
-- se cargó en ordenes_directa. Borra únicamente las filas que trajo esa
-- migración (identificadas por creado_por), sin tocar ningún pedido
-- cargado por la app normalmente.

-- 1) Verificar antes de borrar: debería decir 4475.
select count(*) from ordenes_directa where creado_por = 'Migración Google Sheets';

-- 2) Borrar (irreversible). Correr solo después de confirmar el conteo de arriba.
delete from ordenes_directa where creado_por = 'Migración Google Sheets';
