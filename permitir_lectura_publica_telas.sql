-- Permite que el formulario público de pedido (sin login) pueda leer el
-- catálogo de telas del Stock (cod + nombre) para mostrarlo en el
-- desplegable de "Tela específica" cuando el cliente elige Tela Cliente.
-- No expone nada sensible, solo nombres y códigos de telas.
--
-- Si la tabla "telas" ya tiene RLS activado (lo más probable, porque la
-- usa la app de Stock), esto simplemente le agrega una política de
-- lectura para el público. Si no tuviera RLS activado, esta política no
-- cambia nada (la tabla ya sería de lectura abierta).
drop policy if exists "publico_puede_leer_telas" on telas;
create policy "publico_puede_leer_telas" on telas
  for select
  to anon
  using (true);
