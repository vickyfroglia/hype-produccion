-- Cotizaciones por OT: carga manual de Comercial para presupuestar una OT
-- (Nro OT tipeado a mano, Cliente autocompletado desde la base de Stock,
-- Cant Mts, Tela y $ x Mt Lineal). El Importe se calcula solo, no se guarda.
create table if not exists cotizaciones_ot (
  id bigint generated always as identity primary key,
  fecha date not null default current_date,
  nro_ot text,
  cliente text not null,
  cant_mts numeric,
  tela text,
  cod_tela text,
  precio_mt text,
  creado_por text,
  created_at timestamptz not null default now()
);

alter table cotizaciones_ot enable row level security;

create policy "authenticated_all_cotizaciones_ot"
  on cotizaciones_ot for all
  to authenticated
  using (true)
  with check (true);
