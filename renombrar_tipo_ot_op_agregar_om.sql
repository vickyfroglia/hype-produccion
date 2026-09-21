-- La opción "OT" del desplegable Tipo OT deja de existir: pasa a llamarse
-- "OP". Además se agrega "OM" como opción nueva. El desplegable final queda
-- OP / REPO / OM / OI. Este update renombra los pedidos ya cargados que
-- decían "OT" para que sigan coincidiendo con una opción real del
-- desplegable (si no, quedarían con un valor que ya no existe ahí).
update ordenes_directa set tipo_ot = 'OP' where tipo_ot = 'OT';
