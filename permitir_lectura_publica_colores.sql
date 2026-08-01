-- Permite que el formulario público de pedido (sin login) pueda leer el
-- catálogo de colores del Stock (sigla + nombre) para mostrarlo en el
-- desplegable de "Color tela" cuando el cliente elige Tela Cliente. No
-- expone nada sensible, solo nombres y siglas de colores.
--
-- Si la tabla "colores" ya tiene RLS activado (lo más probable, porque la
-- usa la app de Stock), esto simplemente le agrega una política de
-- lectura para el público. Si no tuviera RLS activado, esta política no
-- cambia nada (la tabla ya sería de lectura abierta).
drop policy if exists "publico_puede_leer_colores" on colores;
create policy "publico_puede_leer_colores" on colores
  for select
  to anon
  using (true);
