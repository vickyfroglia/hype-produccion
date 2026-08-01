import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Se llama desde "Solicitudes de pedido recibidas" cuando el staff hace
// clic en "Marcar cargado" — es decir, cuando YA se revisó y confirmó el
// pedido. Le manda al cliente el pedido consolidado (tela + diseño + mts).
// Recibe los datos ya armados desde el navegador (no vuelve a consultar
// Supabase) porque el staff ya los tiene cargados en pantalla.
interface LineaConsolidada {
  telaOrigen?: string | null;
  telaDetalle?: string | null;
  diseno?: string | null;
  cantidadMts?: number | null;
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  const { email, empresa, lineas } = body || {};
  if (!email || !Array.isArray(lineas) || lineas.length === 0) {
    return NextResponse.json({ error: 'Faltan datos para mandar el mail de confirmación.' }, { status: 400 });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Faltan las variables de entorno GMAIL_USER / GMAIL_APP_PASSWORD: no se pudo enviar el consolidado.');
    return NextResponse.json({ error: 'Falta configurar el mail (GMAIL_USER/GMAIL_APP_PASSWORD).' }, { status: 500 });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });

    const filasHtml = (lineas as LineaConsolidada[])
      .map((l) => {
        const tela = l.telaDetalle || l.telaOrigen || '—';
        return `<tr><td style="padding:6px 10px;border:1px solid #ddd;">${tela}</td><td style="padding:6px 10px;border:1px solid #ddd;">${l.diseno || '—'}</td><td style="padding:6px 10px;border:1px solid #ddd;">${l.cantidadMts ?? '—'}</td></tr>`;
      })
      .join('');

    await transporter.sendMail({
      from: `"HYPE Printlab" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Confirmación de tu pedido — HYPE Printlab',
      html: `
        <div style="font-family: Arial, sans-serif; color: #222;">
          <p>Hola!! Te confirmo que recibimos tu pedido correctamente, te enviamos el consolidado del mismo, para que lo tengas! muchas gracias!!</p>
          <table style="border-collapse: collapse; font-size: 13px; margin: 16px 0;">
            <thead>
              <tr>
                <th style="padding:6px 10px;border:1px solid #ddd;background:#f5f5f5;">Tela</th>
                <th style="padding:6px 10px;border:1px solid #ddd;background:#f5f5f5;">Diseño</th>
                <th style="padding:6px 10px;border:1px solid #ddd;background:#f5f5f5;">Mts</th>
              </tr>
            </thead>
            <tbody>${filasHtml}</tbody>
          </table>
          <p>El equipo de HYPE</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('No se pudo enviar el mail de consolidado del pedido:', err);
    return NextResponse.json({ error: 'No se pudo enviar el mail de confirmación.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
