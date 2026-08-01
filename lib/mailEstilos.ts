// Estilos compartidos para los mails automáticos al cliente del form de
// pedido público (recibido, rechazado, confirmación consolidada): todo el
// texto en mayúscula, tipografía Lato tamaño 18, y el encabezado de las
// tablas en naranja pastel. Se usan como strings de "style" inline porque
// los clientes de mail (Gmail, Outlook, etc.) no siempre respetan <style>
// en el <head> — el inline es lo más confiable.
export const MAIL_FONT = "'Lato', Arial, sans-serif";

export const MAIL_BODY_STYLE = `font-family:${MAIL_FONT};font-size:18px;color:#222;text-transform:uppercase;`;

export const MAIL_TH_STYLE = `padding:8px 12px;border:1px solid #ddd;background:#ffdcb3;color:#7a3b00;text-transform:uppercase;font-family:${MAIL_FONT};font-size:18px;text-align:left;`;

export const MAIL_TD_STYLE = `padding:8px 12px;border:1px solid #ddd;text-transform:uppercase;font-family:${MAIL_FONT};font-size:18px;`;

export const MAIL_FOOTER_STYLE = `margin-top:24px;color:#888;font-size:14px;font-family:${MAIL_FONT};text-transform:uppercase;`;
