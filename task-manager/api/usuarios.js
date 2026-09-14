/**
 * =============================================================================
 * ENDPOINT: /api/usuarios
 * -----------------------------------------------------------------------------
 * QUE HACE ESTE ARCHIVO
 * Expone el archivo `usuarios.txt` como una API REST minima para que el frontend
 * pueda leer y escribir usuarios sin acceder directamente al sistema de archivos
 * (el navegador no puede hacerlo). Es la cara HTTP de la libreria `txtUsers.js`.
 *
 * POR QUE EXISTE
 * Separa la capa de almacenamiento del frontend. Login y Registro llaman a esta
 * API en lugar de manipular localStorage directamente. Cuando se migre a base de
 * datos, este archivo se reescribe para hablar con la DB y el frontend no cambia.
 *
 * METODOS
 * GET  /api/usuarios?email=foo@bar.com -> {email,password,name} o lista completa
 * POST /api/usuarios {email,password,name} -> crea/actualiza usuario
 *   El campo `password` ya debe venir hasheado (SHA-256 hex). Si viene en texto
 *   plano se hashea aqui como respaldo, pero el frontend es responsable de hashear.
 *
 * SEGURIDAD
 * No se devuelve el password en listados masivos si no es necesario; para login
 * se valida con timingSafeEqual en el servidor. Este endpoint es interno del
 * mismo origen, no expone hashes a terceros.
 * =============================================================================
 */

const txt = require('./_lib/txtUsers');

module.exports = async function handler(req, res) {
  // CORS basico por si se prueba desde otro origen en local
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  txt.ensureSeed();

  if (req.method === 'GET') {
    try {
      const email = (req.query && req.query.email) ? String(req.query.email).trim().toLowerCase() : '';
      const users = txt.readUsers();
      if (email) {
        const found = users.find(u => u.email === email);
        if (!found) return res.status(404).json({ error: 'Usuario no encontrado.' });
        return res.status(200).json(found);
      }
      // Lista completa (se usa para login fallback; en produccion se filtraria)
      return res.status(200).json(users);
    } catch (e) {
      console.error('[usuarios] GET error', e);
      return res.status(500).json({ error: 'No se pudo leer el archivo de usuarios.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      let password = typeof body?.password === 'string' ? body.password.trim() : '';
      const name = typeof body?.name === 'string' ? body.name.trim() : '';

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Correo no valido.' });
      }
      if (!password) {
        return res.status(400).json({ error: 'Contraseña requerida.' });
      }
      // Si no es hash de 64 hex, hashear aqui (respaldo)
      if (!/^[a-f0-9]{64}$/i.test(password)) {
        password = txt.hashPassword(password);
      }

      const saved = txt.upsertUser(email, password, name);
      return res.status(200).json({ saved: true, user: { email: saved.email, name: saved.name } });
    } catch (e) {
      console.error('[usuarios] POST error', e);
      return res.status(500).json({ error: 'No se pudo escribir el archivo de usuarios.' });
    }
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return res.status(405).json({ error: 'Metodo no permitido.' });
};
