-- Anticipos que el cliente paga SIN comprometer todavía ninguna orden
-- (o comprometiendo una OT que ya existe, pero sin ser una línea de
-- Producción en sí). Se gestionan aparte de "Pendientes de anticipo",
-- que sí está atado a ordenes_directa.
create table if not exists anticipos_sueltos (
  id bigint generated always as identity primary key,
  fecha date not null default current_date,
  cliente text not null,
  compromete_tela_th boolean not null default false,
  compromete_ot boolean not null default false,
  nro_ot_relacionado text,
  servicio_estampa boolean not null default false,
  cant_mts numeric,
  precio_mt text,
  descuento_pct numeric,
  forma_pago text,
  forma_pago_manual text,
  estado_anticipo text not null default 'PENDIENTE',
  observaciones text,
  creado_por text,
  created_at timestamptz not null default now()
);

alter table anticipos_sueltos enable row level security;

create policy "authenticated_all_anticipos_sueltos"
  on anticipos_sueltos for all
  to authenticated
  using (true)
  with check (true);
