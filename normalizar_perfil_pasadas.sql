-- Las opciones de Perfil ahora son 9 (ST 4 PASS, ST 3 PASS, TUSSOR HQ,
-- TUSSOR 3P, TUSSOR 2P, 3 PASADAS, 2 PASADAS, INEDIT 3P, INEDIT 2P), todas
-- en mayusculas. Los pedidos ya cargados con las opciones viejas en
-- minuscula ('2 pasadas' / '3 pasadas') quedarian sin coincidir con
-- ninguna opcion del nuevo desplegable. Este update los deja en el
-- formato nuevo para que se sigan viendo bien (con su color) en Produccion.
update ordenes_directa set perfil = '2 PASADAS' where perfil = '2 pasadas';
update ordenes_directa set perfil = '3 PASADAS' where perfil = '3 pasadas';
