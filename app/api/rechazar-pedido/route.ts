import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Se llama desde "Solicitudes de pedido recibidas" cuando el staff hace
// clic en "Error pedido" y escribe el motivo — le avisa al cliente por
// mail que su pedido no está bien y por qué, para que lo revise y lo
// reenvíe.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  const { email, razon } = body || {};
  if (!email || !razon) {
    return NextResponse.json({ error: 'Faltan datos para mandar el mail de rechazo.' }, { status: 400 });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Faltan las variables de entorno GMAIL_USER / GMAIL_APP_PASSWORD: no se pudo enviar el rechazo.');
    return NextResponse.json({ error: 'Falta configurar el mail (GMAIL_USER/GMAIL_APP_PASSWORD).' }, { status: 500 });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `"HYPE Printlab" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'PEDIDO RECHAZADO',
      html: `
        <div style="font-family: Arial, sans-serif; color: #222;">
          <p>Hola!! Tu pedido no es correcto, ${razon}.</p>
          <p>Por favor te pedimos que lo revises y lo reenvíes! Desde ya mil gracias,</p>
          <p>El equipo de HYPE</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('No se pudo enviar el mail de rechazo del pedido:', err);
    return NextResponse.json({ error: 'No se pudo enviar el mail de rechazo.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
