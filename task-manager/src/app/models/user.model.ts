/**
 * =============================================================================
 * MODELOS DE USUARIO Y RECUPERACION DE CONTRASENA
 * -----------------------------------------------------------------------------
 * PASO 3 del plan de implementacion.
 *
 * La separacion entre `User` y `StoredUser` es intencional y es la parte mas
 * importante de este archivo:
 *
 *   - `StoredUser` es el registro completo tal y como vive en el almacenamiento
 *     (incluye la contrasena). Nunca sale del AuthService.
 *   - `User` es lo que el resto de la aplicacion puede ver. No tiene contrasena.
 *
 * Asi, aunque un componente reciba el usuario autenticado, no tiene forma de
 * leer la contrasena: el sistema de tipos lo impide en tiempo de compilacion.
 * Es la misma frontera que en una aplicacion real separaria la fila de la base
 * de datos de la respuesta JSON del API.
 * =============================================================================
 */

/** Datos publicos del usuario. Es lo que se expone a los componentes. */
export interface User {
  email: string;
  name: string;
}

/**
 * Registro completo guardado en localStorage.
 *
 * ADVERTENCIA: `password` se guarda en texto plano. Esto es INSEGURO y en este
 * ejercicio es inevitable, no un descuido: cifrar en el navegador no aportaria
 * nada porque la clave de cifrado tendria que estar tambien en el navegador,
 * a la vista de cualquiera que abra las herramientas de desarrollo.
 *
 * En una aplicacion real la contrasena NUNCA llega al cliente ni se guarda en
 * el: el servidor almacena solo un hash con sal (bcrypt, argon2) y compara
 * contra el. Este campo desaparece en cuanto exista el backend.
 */
export interface StoredUser extends User {
  password: string;
}

/**
 * Token de recuperacion de contrasena.
 *
 * Es la pieza que demuestra que quien cambia la contrasena tiene realmente
 * acceso al buzon de correo asociado a la cuenta. Sin token, cualquiera podria
 * cambiar la contrasena de cualquier correo con solo escribirlo.
 *
 * Se modela con las mismas tres reglas que aplicaria un servidor:
 *   1. Caduca  -> el campo `expiresAt`.
 *   2. Un solo uso -> el campo `usedAt`.
 *   3. Es impredecible -> se genera con crypto.randomUUID().
 */
export interface ResetToken {
  /** Cadena aleatoria que viaja en la URL: /restablecer?token=... */
  token: string;

  /** Cuenta a la que pertenece el token. */
  email: string;

  /** Marca de tiempo (Date.now()) en la que el token deja de ser valido. */
  expiresAt: number;

  /** Marca de tiempo del momento en que se consumio; null si sigue sin usar. */
  usedAt: number | null;
}

/**
 * Resultado de solicitar una recuperacion de contrasena.
 *
 * Son dos datos distintos y ninguno implica al otro:
 *
 *   token      El token generado, o null si el correo no esta registrado.
 *              La pantalla NO debe revelar cual de los dos casos ocurrio: ver
 *              la nota sobre enumeracion de usuarios en el componente.
 *
 *   emailSent  Si la funcion serverless logro enviar el correo. Sera false al
 *              trabajar en local con `ng serve`, porque ahi no existe /api, y
 *              tambien si Resend rechaza el envio. En ese caso la pantalla
 *              muestra el bloque "Modo demo" con el enlace como respaldo.
 */
export interface PasswordResetResult {
  token: string | null;
  emailSent: boolean;
}
