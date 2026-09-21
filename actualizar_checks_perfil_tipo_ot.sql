-- Las reglas (check constraints) de Perfil y Tipo OT en la base todavia
-- validan contra las opciones VIEJAS. Este script las actualiza para que
-- coincidan con el desplegable actual de la app antes de normalizar/migrar
-- datos, si no cualquier UPDATE/INSERT que use un valor nuevo es rechazado.

-- Perfil: antes solo permitia '2 pasadas' / '3 pasadas' (minuscula).
alter table ordenes_directa drop constraint ordenes_directa_perfil_check;
alter table ordenes_directa add constraint ordenes_directa_perfil_check
  check (perfil = ANY (ARRAY['ST 4 PASS','ST 3 PASS','TUSSOR HQ','TUSSOR 3P','TUSSOR 2P','3 PASADAS','2 PASADAS','INEDIT 3P','INEDIT 2P']::text[]));

-- Tipo OT: antes permitia 'OT' y no permitia 'OM'.
alter table ordenes_directa drop constraint ordenes_directa_tipo_ot_check;
alter table ordenes_directa add constraint ordenes_directa_tipo_ot_check
  check (tipo_ot = ANY (ARRAY['OP','REPO','OM','OI']::text[]));
