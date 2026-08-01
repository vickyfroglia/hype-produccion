-- Solicitudes de pedido cargadas por clientes desde un formulario público
-- (sin login), calcado del Excel "FORM DE PEDIDO" que hoy se manda por
-- mail. Es una "bandeja de entrada" separada de ordenes_directa: no se
-- convierte en pedido real hasta que alguien de HYPE la revisa y la
-- confirma manualmente desde "Ingreso y Modificación de Pedidos".
--
-- Se separa en dos tablas porque un mismo pedido puede traer varios
-- diseños (como las filas de la planilla), cada uno con su propia tela,
-- cantidad y observaciones.

create table if not exists solicitudes_pedido (
  id bigserial primary key,
  tipo_trabajo text,           -- 'DIRECTA (ALG/LINO)' | 'SUBLIMACIÓN'
  empresa text not null,       -- Empresa / Marca y Razón Social
  contacto text,
  telefono text,
  email text,
  direccion text,
  cp text,
  provincia text,
  estado text not null default 'pendiente', -- 'pendiente' | 'cargado'
  created_at timestamptz not null default now()
);

create table if not exists solicitudes_pedido_lineas (
  id bigserial primary key,
  solicitud_id bigint not null references solicitudes_pedido(id) on delete cascade,
  tela_origen text,   -- 'CLIENTE' | 'HYPE'
  diseno text,
  cantidad_mts numeric,
  observaciones text
);

alter table solicitudes_pedido enable row level security;
alter table solicitudes_pedido_lineas enable row level security;

-- Cualquiera (sin login) puede CREAR una solicitud y sus líneas — es lo que
-- usa el formulario público. No puede leer, editar ni borrar nada.
drop policy if exists "publico_puede_insertar" on solicitudes_pedido;
create policy "publico_puede_insertar" on solicitudes_pedido
  for insert
  to anon
  with check (true);

drop policy if exists "publico_puede_insertar" on solicitudes_pedido_lineas;
create policy "publico_puede_insertar" on solicitudes_pedido_lineas
  for insert
  to anon
  with check (true);

-- Solo el personal logueado (staff de HYPE) puede ver/editar/borrar las
-- solicitudes, para revisarlas y marcarlas como cargadas.
drop policy if exists "staff_full_access" on solicitudes_pedido;
create policy "staff_full_access" on solicitudes_pedido
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "staff_full_access" on solicitudes_pedido_lineas;
create policy "staff_full_access" on solicitudes_pedido_lineas
  for all
  to authenticated
  using (true)
  with check (true);
