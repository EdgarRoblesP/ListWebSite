/**
 * =============================================================================
 * FUNCION SERVERLESS: ENVIO DEL CORREO DE RECUPERACION
 * -----------------------------------------------------------------------------
 * Ruta publica: POST /api/send-reset-email
 *
 * QUE ES ESTE ARCHIVO
 * La primera pieza real de servidor del proyecto. Vercel convierte cada archivo
 * dentro de /api en una funcion serverless: se ejecuta en el servidor, no en el
 * navegador, y por tanto puede guardar secretos (la clave de Resend) y hablar
 * con servicios externos.
 *
 * POR QUE EXISTE
 * Un navegador no puede enviar correos. Hasta ahora, el enlace de recuperacion
 * se mostraba en pantalla dentro del bloque "Modo demo". Con esta funcion el
 * correo se envia de verdad, y ese bloque pasa a ser solo un respaldo para
 * cuando no hay servidor (por ejemplo al trabajar en local con `ng serve`).
 *
 * QUE SIGUE SIN SER REAL
 * El token NO se guarda aqui. Sigue viviendo en el localStorage del navegador
 * que pidio la recuperacion, porque el proyecto todavia no tiene base de datos.
 * Consecuencia practica: el enlace del correo solo funciona si se abre en EL
 * MISMO navegador que lo solicito. Abrirlo en el telefono dara "enlace no
 * valido", porque ese navegador no tiene el token guardado.
 *
 * Para levantar esa limitacion basta un almacen con expiracion (Vercel KV o
 * Upstash Redis, ambos con capa gratuita): el token se guardaria aqui con un
 * TTL de 15 minutos en lugar de en el navegador.
 *
 * SIN DEPENDENCIAS
 * Se llama al API de Resend con el `fetch` global que ya trae el runtime de
 * Node en Vercel, en vez de instalar el paquete `resend`. Asi el package.json
 * del proyecto Angular no cambia.
 *
 * VARIABLES DE ENTORNO (se configuran en Vercel, nunca en el codigo)
 *   RESEND_API_KEY   obligatoria. Clave del panel de Resend.
 *   RESEND_FROM      opcional. Remitente. Por defecto onboarding@resend.dev,
 *                    que es el remitente de pruebas de Resend y SOLO entrega
 *                    correos a la direccion duena de la cuenta. Para enviar a
 *                    cualquier destinatario hay que verificar un dominio propio
 *                    y poner aqui algo como "Tareas <no-reply@tudominio.com>".
 * =============================================================================
 */

/** Limite de tamano del token aceptado, para no reenviar basura al correo. */
const MAX_TOKEN_LENGTH = 100;

/** Validacion de correo deliberadamente simple: el filtro real lo hace Resend. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(request, response) {
  // ---------------------------------------------------------------------------
  // 1. Solo se acepta POST. Un GET con los datos en la URL dejaria el correo
  //    y el token escritos en los registros del servidor.
  // ---------------------------------------------------------------------------
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Metodo no permitido.' });
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // El cliente no necesita saber por que; en los registros si queda claro.
    console.error('[send-reset-email] Falta la variable de entorno RESEND_API_KEY.');
    return response.status(500).json({ error: 'El servicio de correo no esta configurado.' });
  }

  // ---------------------------------------------------------------------------
  // 2. Validacion de la entrada.
  // ---------------------------------------------------------------------------
  const body = typeof request.body === 'string' ? safeParse(request.body) : request.body;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const token = typeof body?.token === 'string' ? body.token.trim() : '';

  if (!EMAIL_PATTERN.test(email)) {
    return response.status(400).json({ error: 'Correo electronico no valido.' });
  }

  if (!token || token.length > MAX_TOKEN_LENGTH || /[^A-Za-z0-9-]/.test(token)) {
    return response.status(400).json({ error: 'Token no valido.' });
  }

  // ---------------------------------------------------------------------------
  // 3. La URL del enlace SE CONSTRUYE AQUI, no la manda el cliente.
  //
  //    Es una decision de seguridad. Si el navegador pudiera enviar la URL
  //    completa, cualquiera podria pedirle a este servidor que mandara un correo
  //    con un enlace a un sitio de phishing, firmado con tu dominio. Componiendo
  //    la direccion a partir de la cabecera host de la propia peticion, el
  //    enlace solo puede apuntar a este mismo despliegue.
  // ---------------------------------------------------------------------------
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers['x-forwarded-host'] || request.headers.host;

  if (!host) {
    return response.status(400).json({ error: 'No se pudo determinar el dominio.' });
  }

  const resetUrl = `${protocol}://${host}/restablecer?token=${encodeURIComponent(token)}`;

  // ---------------------------------------------------------------------------
  // 4. Envio a traves de Resend.
  // ---------------------------------------------------------------------------
  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Tareas <onboarding@resend.dev>',
        to: [email],
        subject: 'Restablece tu contrasena',
        text: buildPlainText(resetUrl),
        html: buildHtml(resetUrl)
      })
    });

    if (!resendResponse.ok) {
      const detail = await resendResponse.text();
      console.error('[send-reset-email] Resend respondio', resendResponse.status, detail);
      return response.status(502).json({ error: 'No se pudo enviar el correo.' });
    }

    return response.status(200).json({ sent: true });
  } catch (error) {
    console.error('[send-reset-email] Fallo la llamada a Resend:', error);
    return response.status(502).json({ error: 'No se pudo enviar el correo.' });
  }
};

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Version en texto plano. No es opcional: muchos clientes de correo la usan
 * como vista previa, y los filtros de spam penalizan los correos que solo
 * llevan HTML.
 */
function buildPlainText(resetUrl) {
  return [
    'Recibimos una solicitud para restablecer tu contrasena.',
    '',
    'Abre este enlace para elegir una nueva:',
    resetUrl,
    '',
    'El enlace caduca en 15 minutos y solo puede usarse una vez.',
    'Si no fuiste tu, puedes ignorar este mensaje.'
  ].join('\n');
}

/**
 * Version HTML. Los estilos van en atributos `style` en linea porque la mayoria
 * de clientes de correo descartan las hojas de estilo y las etiquetas <style>.
 */
function buildHtml(resetUrl) {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:20px;">Restablece tu contrase&ntilde;a</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        Recibimos una solicitud para restablecer tu contrase&ntilde;a. Pulsa el bot&oacute;n para elegir una nueva.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:bold;">
          Restablecer contrase&ntilde;a
        </a>
      </p>
      <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">
        El enlace caduca en 15 minutos y solo puede usarse una vez.
        Si el bot&oacute;n no funciona, copia esta direcci&oacute;n en tu navegador:
      </p>
      <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">${resetUrl}</p>
    </div>
  </body>
</html>`;
}
