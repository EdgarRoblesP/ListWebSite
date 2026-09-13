import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';
import { PasswordResetResult, ResetToken, StoredUser, User } from '../models/user.model';

/**
 * =============================================================================
 * AUTH SERVICE - BACKEND SIMULADO
 * -----------------------------------------------------------------------------
 * PASO 3 del plan de implementacion.
 *
 * QUE HACE ESTE ARCHIVO
 * Contiene toda la logica que normalmente viviria en un servidor: buscar
 * usuarios, validar credenciales, generar y consumir tokens de recuperacion.
 * Como el proyecto no tiene servidor ni base de datos, el "almacen" es
 * localStorage del navegador.
 *
 * LA REGLA DE ORO DE ESTE ARCHIVO
 * Todos los metodos publicos devuelven un Observable y pueden fallar, aunque
 * por dentro solo lean localStorage de forma sincrona. Eso es deliberado:
 *
 *   - Los componentes se escriben una sola vez, contra una API asincrona.
 *   - Cuando exista el backend real, se sustituye el cuerpo de estos metodos
 *     por llamadas HttpClient y NINGUN componente necesita cambiar.
 *
 * Si los metodos devolviesen valores sincronos, hoy funcionarian y el dia que
 * apareciese la red habria que reescribir las tres pantallas.
 *
 * POR QUE SE SIMULA LATENCIA
 * Cada operacion pasa por timer(NETWORK_DELAY_MS). No es decoracion: obliga a
 * implementar hoy los estados de "cargando" y de error que se van a necesitar
 * igual con un servidor. Sin ese retardo las pantallas serian instantaneas
 * ahora y se romperian al conectar la red.
 *
 * LIMITES CONOCIDOS (es un ejercicio de practica, no codigo de produccion)
 *   - Las contrasenas se guardan en texto plano; ver user.model.ts.
 *   - Cualquiera puede editar localStorage desde la consola del navegador y
 *     concederse acceso. Sin servidor, esto no tiene solucion posible.
 *   - No hay registro de usuarios: se crea un usuario semilla (ver
 *     DEMO_USER) para poder entrar la primera vez.
 * =============================================================================
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  /* --- Claves de almacenamiento ---------------------------------------------
     Se usan tres claves separadas en lugar de un unico objeto gigante porque
     cada una tiene un ciclo de vida distinto: los usuarios son permanentes, la
     sesion se borra al cerrar sesion y los tokens caducan solos. Mezclarlas
     obligaria a leer y reescribir todo el bloque en cada operacion. */
  private static readonly USERS_KEY = 'app.users';
  private static readonly SESSION_KEY = 'app.session';
  private static readonly TOKENS_KEY = 'app.resetTokens';

  /** Retardo artificial que imita el viaje de ida y vuelta a un servidor. */
  private static readonly NETWORK_DELAY_MS = 600;

  /** Vigencia del token de recuperacion: 15 minutos, como es habitual. */
  private static readonly TOKEN_TTL_MS = 15 * 60 * 1000;

  /**
   * Funcion serverless que envia el correo de recuperacion.
   *
   * Ruta relativa a proposito: en Vercel resuelve contra el propio dominio del
   * despliegue, sin tener que configurar ninguna direccion. En local con
   * `ng serve` no existe y la llamada falla, que es justo lo que activa el
   * bloque "Modo demo" como respaldo.
   */
  private static readonly SEND_EMAIL_ENDPOINT = '/api/send-reset-email';

  /** Longitud minima exigida a una contrasena nueva. */
  public static readonly MIN_PASSWORD_LENGTH = 8;

  /**
   * Usuario semilla. Sin pantalla de registro no habria manera de entrar la
   * primera vez, asi que se crea automaticamente si el almacen esta vacio.
   *
   * Es publico para que la pantalla de login pueda mostrar estas credenciales
   * en su bloque de ayuda sin duplicar los valores en dos archivos.
   */
  public static readonly DEMO_USER: StoredUser = {
    email: 'edgarrobles076@gmail.com',
    name: 'Usuario Demo',
    password: 'demo1234'
  };

  /* --- Estado de sesion -----------------------------------------------------
     Se expone con signals (Angular 19) en lugar de BehaviorSubject porque el
     guardian de ruta necesita leer el valor actual de forma sincrona, y porque
     TaskService reacciona al cambio de usuario con un effect().

     El signal se inicializa leyendo localStorage: asi, al recargar la pagina,
     la sesion sobrevive. */
  /** Cliente HTTP, usado solo para llamar a la funcion de envio de correo. */
  private readonly http = inject(HttpClient);

  private readonly currentUserSignal = signal<User | null>(this.readSession());

  /** Usuario autenticado, o null. Solo lectura desde fuera del servicio. */
  public readonly currentUser = this.currentUserSignal.asReadonly();

  /** Atajo booleano que consume el guardian de ruta. */
  public readonly isLoggedIn = computed<boolean>(() => this.currentUserSignal() !== null);

  constructor() {
    this.seedDemoUserIfEmpty();
  }

  /* ==========================================================================
     OPERACIONES PUBLICAS (equivalentes a los endpoints de un API)
     ========================================================================== */

  /**
   * POST /login equivalente.
   *
   * Devuelve el usuario autenticado o falla con un mensaje generico.
   * El mensaje NO distingue entre "el correo no existe" y "la contrasena es
   * incorrecta": decirlo permitiria a un atacante averiguar que correos estan
   * registrados probandolos uno a uno.
   */
  public login(email: string, password: string): Observable<User> {
    return this.simulateRequest(() => {
      const normalizedEmail = this.normalizeEmail(email);
      const found = this.readUsers().find(user => user.email === normalizedEmail);

      if (!found || found.password !== password) {
        throw new Error('Correo o contrasena incorrectos.');
      }

      // Se construye la sesion sin el campo password: el resto de la
      // aplicacion nunca ve la contrasena.
      const session: User = { email: found.email, name: found.name };
      this.writeJson(AuthService.SESSION_KEY, session);
      this.currentUserSignal.set(session);

      return session;
    });
  }

  /** Cierra la sesion. Sincrono porque no necesita hablar con nadie. */
  public logout(): void {
    this.removeKey(AuthService.SESSION_KEY);
    this.currentUserSignal.set(null);
  }

  /**
   * POST /password-reset equivalente. Frame 9:18.
   *
   * Genera un token de un solo uso y lo guarda. En una aplicacion real el
   * servidor enviaria por correo el enlace /restablecer?token=... y este metodo
   * no devolveria nada al cliente.
   *
   * Aqui devuelve el token porque no hay forma de enviar un correo desde el
   * navegador: la pantalla lo muestra en el bloque "Modo demo". Esa es la
   * unica concesion del ejercicio; todo lo demas (caducidad, un solo uso,
   * validacion) funciona igual que en produccion.
   *
   * @returns el token si el correo existe, o null si no existe.
   *          IMPORTANTE: la pantalla debe mostrar el mismo mensaje de exito en
   *          ambos casos. Responder "ese correo no esta registrado" seria
   *          regalar una lista de usuarios validos.
   */
  public requestPasswordReset(email: string): Observable<PasswordResetResult> {
    const normalizedEmail = this.normalizeEmail(email);

    return this.simulateRequest(() => {
      const exists = this.readUsers().some(user => user.email === normalizedEmail);

      if (!exists) {
        return null;
      }

      const token: ResetToken = {
        token: this.generateToken(),
        email: normalizedEmail,
        expiresAt: Date.now() + AuthService.TOKEN_TTL_MS,
        usedAt: null
      };

      // Se descartan los tokens anteriores de este correo: pedir la
      // recuperacion de nuevo debe invalidar el enlace anterior.
      const tokens = this.readTokens().filter(item => item.email !== normalizedEmail);
      tokens.push(token);
      this.writeJson(AuthService.TOKENS_KEY, tokens);

      return token.token;
    }).pipe(
      switchMap(token => {
        /* Correo no registrado: no hay nada que enviar. Se devuelve el mismo
           tipo de resultado para que la pantalla no pueda distinguir este caso
           del otro por la forma de la respuesta. */
        if (token === null) {
          return of<PasswordResetResult>({ token: null, emailSent: false });
        }

        return this.sendResetEmail(normalizedEmail, token).pipe(
          map(emailSent => ({ token, emailSent }))
        );
      })
    );
  }

  /**
   * Pide a la funcion serverless que envie el correo con el enlace.
   *
   * Solo se le manda el correo y el token. La URL completa la compone el
   * servidor a partir de su propio dominio: si el cliente pudiera enviarla,
   * cualquiera podria hacer que este despliegue mandara correos con enlaces a
   * un sitio de phishing. Ver api/send-reset-email.js.
   *
   * NUNCA falla hacia fuera. Si no hay servidor —el caso normal al trabajar en
   * local con `ng serve`, donde /api no existe— o si Resend rechaza el envio,
   * devuelve false y la pantalla recurre al bloque "Modo demo". Propagar el
   * error dejaria al usuario sin ninguna forma de continuar, cuando el token ya
   * se genero correctamente.
   */
  private sendResetEmail(email: string, token: string): Observable<boolean> {
    return this.http
      .post<{ sent: boolean }>(AuthService.SEND_EMAIL_ENDPOINT, { email, token })
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
  }

  /**
   * GET /password-reset/:token equivalente. Frame 9:42, al entrar.
   *
   * Comprueba que el token sirve ANTES de mostrar el formulario. Si no sirve,
   * la pantalla ensena un aviso y un enlace para reiniciar el proceso, en vez
   * de dejar que el usuario escriba una contrasena que va a ser rechazada.
   *
   * @returns el correo asociado al token, para poder mostrarlo en pantalla.
   */
  public validateResetToken(token: string): Observable<string> {
    return this.simulateRequest(() => this.consumeTokenChecks(token).email);
  }

  /**
   * PUT /password equivalente. Frame 9:42, al enviar.
   *
   * Vuelve a validar el token aunque validateResetToken ya lo hiciera al
   * cargar la pantalla. No es redundante: entre una llamada y otra el token
   * pudo caducar, o pudo usarse desde otra pestana. Un servidor real valida
   * siempre en el momento de la escritura.
   */
  public resetPassword(token: string, newPassword: string): Observable<void> {
    return this.simulateRequest(() => {
      if (newPassword.length < AuthService.MIN_PASSWORD_LENGTH) {
        throw new Error(
          `La contrasena debe tener al menos ${AuthService.MIN_PASSWORD_LENGTH} caracteres.`
        );
      }

      const resetToken = this.consumeTokenChecks(token);

      // 1. Actualizar la contrasena del usuario.
      const users = this.readUsers().map(user =>
        user.email === resetToken.email ? { ...user, password: newPassword } : user
      );
      this.writeJson(AuthService.USERS_KEY, users);

      // 2. Marcar el token como usado para que el enlace no valga dos veces.
      const tokens = this.readTokens().map(item =>
        item.token === resetToken.token ? { ...item, usedAt: Date.now() } : item
      );
      this.writeJson(AuthService.TOKENS_KEY, tokens);

      // 3. Cerrar cualquier sesion abierta. Cambiar la contrasena debe
      //    expulsar al usuario y obligarle a entrar con la nueva.
      this.logout();
    });
  }

  /* ==========================================================================
     AYUDANTES INTERNOS
     ========================================================================== */

  /**
   * Envuelve una operacion sincrona en un Observable con retardo.
   *
   * Se usa timer().pipe(map()) en lugar de of().pipe(delay()) por un detalle
   * sutil: delay() solo retrasa los valores, no los errores. Con timer+map, si
   * `work` lanza una excepcion, el error tambien llega despues del retardo,
   * que es como se comportaria un servidor devolviendo un 401.
   */
  private simulateRequest<T>(work: () => T): Observable<T> {
    return timer(AuthService.NETWORK_DELAY_MS).pipe(map(() => work()));
  }

  /**
   * Las tres comprobaciones que definen si un token de recuperacion es valido.
   * Se extraen a un metodo porque se ejecutan dos veces: al abrir la pantalla
   * y al guardar la contrasena.
   */
  private consumeTokenChecks(token: string): ResetToken {
    const found = this.readTokens().find(item => item.token === token);

    // 1. Existe?
    if (!found) {
      throw new Error('El enlace de recuperacion no es valido.');
    }

    // 2. Sigue sin usarse?
    if (found.usedAt !== null) {
      throw new Error('Este enlace ya se utilizo. Solicita uno nuevo.');
    }

    // 3. No ha caducado?
    if (found.expiresAt < Date.now()) {
      throw new Error('El enlace de recuperacion ha caducado. Solicita uno nuevo.');
    }

    return found;
  }

  /**
   * Genera la cadena aleatoria del token.
   *
   * crypto.randomUUID() usa el generador criptografico del navegador. Math.random()
   * NO sirve aqui: es predecible, y un token predecible es un token inutil.
   * El respaldo manual cubre navegadores antiguos o contextos sin HTTPS, donde
   * crypto.randomUUID puede no existir.
   */
  private generateToken(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    const random = new Uint8Array(16);
    crypto.getRandomValues(random);
    return Array.from(random)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /** Los correos se comparan siempre en minusculas y sin espacios sobrantes. */
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /** Crea el usuario de demostracion la primera vez que se abre la aplicacion. */
  private seedDemoUserIfEmpty(): void {
    if (this.readUsers().length === 0) {
      this.writeJson(AuthService.USERS_KEY, [AuthService.DEMO_USER]);
    }
  }

  private readUsers(): StoredUser[] {
    return this.readJson<StoredUser[]>(AuthService.USERS_KEY) ?? [];
  }

  private readTokens(): ResetToken[] {
    return this.readJson<ResetToken[]>(AuthService.TOKENS_KEY) ?? [];
  }

  private readSession(): User | null {
    return this.readJson<User>(AuthService.SESSION_KEY);
  }

  /* --- Acceso a localStorage -------------------------------------------------
     Los tres metodos siguientes van envueltos en try/catch porque localStorage
     puede fallar de tres formas: no existir (renderizado en servidor), estar
     bloqueado por la configuracion del navegador, o contener JSON corrupto si
     alguien lo edito a mano. En todos esos casos se prefiere degradar a "no
     hay datos" antes que romper la aplicacion. */

  private readJson<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  }

  private writeJson(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Sin almacenamiento la aplicacion sigue funcionando, pero los datos no
      // sobreviven a la recarga de la pagina.
    }
  }

  private removeKey(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignorado por el mismo motivo.
    }
  }
}
