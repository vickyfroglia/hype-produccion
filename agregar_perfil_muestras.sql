-- Agrega la columna Perfil a Muestras (mismas 9 opciones y colores que en
-- Produccion): ST 4 PASS, ST 3 PASS, TUSSOR HQ, TUSSOR 3P, TUSSOR 2P,
-- 3 PASADAS, 2 PASADAS, INEDIT 3P, INEDIT 2P.
alter table muestras add column if not exists perfil text;
