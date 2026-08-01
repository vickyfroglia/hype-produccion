import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { MAIL_BODY_STYLE, MAIL_TH_STYLE, MAIL_TD_STYLE, MAIL_FOOTER_STYLE } from '../../../lib/mailEstilos';

// Recibe el pedido del formulario público (/pedido), lo guarda como
// "solicitud pendiente" (no entra directo a Producción) y le manda al
// cliente un mail de confirmación de que lo recibimos. Corre del lado del
// servidor porque el envío de mail necesita las credenciales de Gmail
// (GMAIL_USER / GMAIL_APP_PASSWORD), que nunca deben quedar expuestas en
// el navegador.
//
// Usamos el Service Role (no el anon key) para guardar el pedido: la
// política de anon en solicitudes_pedido solo permite INSERTAR, no LEER —
// y el .select().single() de después del insert necesita permiso de
// lectura para devolver la fila (si no, Supabase "pierde" el resultado y
// esto falla con "No se pudo guardar el pedido" aunque en realidad sí se
// guardó). El Service Role evita ese problema sin tener que abrirle
// lectura pública a la tabla.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LineaPayload {
  telaOrigen?: string;
  telaDetalle?: string;
  diseno: string;
  cantidadMts: number;
  observaciones?: string;
}

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY.');
    return NextResponse.json({ error: 'No se pudo guardar el pedido. Probá de nuevo en unos minutos.' }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  const { tipoTrabajo, empresa, contacto, telefono, email, direccion, cp, provincia, lineas } = body || {};

  if (!empresa || !email || !Array.isArray(lineas) || lineas.length === 0) {
    return NextResponse.json({ error: 'Faltan datos obligatorios (empresa, mail y al menos un diseño).' }, { status: 400 });
  }

  const { data: solicitud, error: errorHeader } = await supabaseAdmin
    .from('solicitudes_pedido')
    .insert({
      tipo_trabajo: tipoTrabajo || null,
      empresa,
      contacto: contacto || null,
      telefono: telefono || null,
      email,
      direccion: direccion || null,
      cp: cp || null,
      provincia: provincia || null,
    })
    .select()
    .single();

  if (errorHeader || !solicitud) {
    console.error('Error guardando la solicitud de pedido:', errorHeader);
    return NextResponse.json({ error: 'No se pudo guardar el pedido. Probá de nuevo en unos minutos.' }, { status: 500 });
  }

  const { error: errorLineas } = await supabaseAdmin.from('solicitudes_pedido_lineas').insert(
    (lineas as LineaPayload[]).map((l) => ({
      solicitud_id: solicitud.id,
      tela_origen: l.telaOrigen || null,
      tela_detalle: l.telaDetalle || null,
      diseno: l.diseno,
      cantidad_mts: l.cantidadMts,
      observaciones: l.observaciones || null,
    }))
  );

  if (errorLineas) {
    console.error('Error guardando los diseños de la solicitud:', errorLineas);
    return NextResponse.json({ error: 'El pedido se guardó pero hubo un problema al cargar los diseños. Escribinos para confirmarlo.' }, { status: 500 });
  }

  // Mail de confirmación al cliente. Si falta configurar las credenciales,
  // o si el envío falla por algún motivo, no hacemos fallar el pedido —
  // ya quedó guardado igual, solo no se pudo avisar por mail.
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      });
      const filasHtml = (lineas as LineaPayload[])
        .map(
          (l) =>
            `<tr><td style="${MAIL_TD_STYLE}">${l.telaOrigen || '—'}</td><td style="${MAIL_TD_STYLE}">${l.telaDetalle || '—'}</td><td style="${MAIL_TD_STYLE}">${l.diseno}</td><td style="${MAIL_TD_STYLE}">${l.cantidadMts}</td><td style="${MAIL_TD_STYLE}">${l.observaciones || '—'}</td></tr>`
        )
        .join('');
      await transporter.sendMail({
        from: `"HYPE Printlab" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'RECIBIMOS TU PEDIDO — HYPE PRINTLAB',
        html: `
          <div style="${MAIL_BODY_STYLE}">
            <h2 style="margin-bottom:4px;text-transform:uppercase;">¡Gracias, ${empresa}!</h2>
            <p>Recibimos tu pedido y lo vamos a revisar antes de confirmarlo.</p>
            <table style="border-collapse: collapse; margin: 16px 0;">
              <thead>
                <tr>
                  <th style="${MAIL_TH_STYLE}">Tela</th>
                  <th style="${MAIL_TH_STYLE}">Tela específica</th>
                  <th style="${MAIL_TH_STYLE}">Diseño</th>
                  <th style="${MAIL_TH_STYLE}">Mts</th>
                  <th style="${MAIL_TH_STYLE}">Observaciones</th>
                </tr>
              </thead>
              <tbody>${filasHtml}</tbody>
            </table>
            <p>Recordá: si la tela es tuya, el plazo para enviarla es de <b>72 hs</b>, con el remito correspondiente (marca/razón social, descripción, mts y cantidad de rollos por tipo de tela). Si envías en kg, necesitamos obligatoriamente el rinde.</p>
            <p style="${MAIL_FOOTER_STYLE}">HYPE printlab</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('No se pudo enviar el mail de confirmación al cliente:', err);
    }
  } else {
    console.error('Faltan las variables de entorno GMAIL_USER / GMAIL_APP_PASSWORD: no se envió el mail de confirmación.');
  }

  return NextResponse.json({ ok: true });
}
