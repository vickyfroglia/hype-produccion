-- Cuando el anticipo suelto compromete tela HYPE (TH), guardamos también
-- qué tela puntual es (descripción y código real del stock TH).
alter table anticipos_sueltos add column if not exists tela text;
alter table anticipos_sueltos add column if not exists cod_tela text;
