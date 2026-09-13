import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PasswordResetResult } from '../../models/user.model';

/**
 * =============================================================================
 * PANTALLA "RECUPERAR CONTRASENA" - Frame 9:18 de Figma
 * -----------------------------------------------------------------------------
 * PASO 5.2 del plan de implementacion.
 *
 * Primer paso del flujo: el usuario escribe su correo y se le genera un enlace
 * de recuperacion.
 *
 * ELEMENTOS ANADIDOS AL DISENO ORIGINAL
 * El frame no tenia boton de envio ni salida hacia el login. Se anadieron,
 * siguiendo el estilo de los frames 1:3 y 9:42:
 *   - Boton "Enviar instrucciones", 53px de alto y el ancho del campo.
 *   - Enlace "Volver a iniciar sesion" bajo el boton.
 *
 * POR QUE NO SE NAVEGA A OTRA RUTA AL ENVIAR
 * Al recibir la respuesta, el contenido de la tarjeta se sustituye por el
 * mensaje de confirmacion (la bandera `sent`) sin cambiar de URL. Dos motivos:
 *   1. Visualmente es una transicion dentro de la misma tarjeta, como en el
 *      diseno, en lugar de un salto de pantalla.
 *   2. Si el usuario recarga, vuelve al formulario limpio en vez de quedarse
 *      en una confirmacion huerfana sin datos.
 *
 * EL CORREO ELECTRONICO: DOS CAMINOS SEGUN DONDE SE EJECUTE
 * Un navegador no puede enviar correos, asi que el envio lo hace la funcion
 * serverless api/send-reset-email.js a traves de Resend. De ahi que esta
 * pantalla tenga dos desenlaces posibles:
 *
 *   emailSent = true   Desplegado en Vercel. El enlace viaja al buzon y la
 *                      pantalla solo confirma el envio.
 *   emailSent = false  En local con `ng serve`, donde /api no existe, o si
 *                      Resend rechaza el envio. Entra el bloque "Modo demo",
 *                      que muestra el enlace en pantalla como respaldo.
 *
 * El token es identico en ambos casos: aleatorio, con caducidad de 15 minutos,
 * de un solo uso y validado al abrir el enlace. Lo unico que cambia es como
 * llega a manos del usuario.
 *
 * LIMITACION QUE SIGUE EN PIE
 * El token se guarda en el localStorage del navegador que pidio la
 * recuperacion, porque el proyecto aun no tiene base de datos. Por eso el
 * enlace del correo solo funciona si se abre en ESE MISMO navegador; en el
 * telefono dara "enlace no valido". Se resuelve moviendo el token a un almacen
 * con expiracion en el servidor (Vercel KV o Upstash Redis).
 * =============================================================================
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../../shared/auth-card.css', './forgot-password.component.css']
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  public submitting = false;
  public errorMessage: string | null = null;

  /** true en cuanto la solicitud se procesa: cambia el contenido de la tarjeta. */
  public sent = false;

  /** Correo al que se "envio" el aviso; se muestra en la confirmacion. */
  public sentToEmail = '';

  /**
   * Token generado, SOLO para el bloque de modo demo.
   *
   * Es null cuando el correo no estaba registrado. En ese caso la pantalla
   * muestra exactamente la misma confirmacion, pero sin enlace: ver la nota
   * sobre no revelar que correos existen, mas abajo.
   */
  public demoToken: string | null = null;

  /**
   * true si la funcion serverless logro enviar el correo de verdad.
   *
   * Cuando es true, la pantalla NO muestra el bloque "Modo demo": el enlace ya
   * esta en el buzon del usuario y ensenarlo tambien en pantalla seria un
   * agujero, porque cualquiera con acceso a esa pantalla podria usarlo.
   *
   * Sera false al trabajar en local con `ng serve`, donde /api no existe.
   */
  public emailSent = false;

  public readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  public get email() {
    return this.form.controls.email;
  }

  public showEmailError(): boolean {
    return this.email.invalid && (this.email.touched || this.email.dirty);
  }

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.submitting) {
      return;
    }

    this.submitting = true;
    this.errorMessage = null;

    const email = this.form.getRawValue().email.trim();

    this.auth.requestPasswordReset(email).subscribe({
      next: (result: PasswordResetResult) => {
        this.submitting = false;
        this.sent = true;
        this.sentToEmail = email;
        this.emailSent = result.emailSent;

        /* DECISION DE SEGURIDAD IMPORTANTE
           Si el correo no existe, el servicio devuelve null. La pantalla
           muestra el MISMO mensaje de confirmacion en los dos casos y solo
           se omite el enlace del bloque demo.

           Si en cambio se dijera "ese correo no esta registrado", cualquiera
           podria ir probando direcciones para averiguar quien tiene cuenta en
           la aplicacion. Se llama enumeracion de usuarios y es una fuga de
           informacion real, no una precaucion teorica. */
        this.demoToken = result.token;
      },
      error: (error: Error) => {
        this.errorMessage = error.message;
        this.submitting = false;
      }
    });
  }

  /** Permite volver al formulario desde la confirmacion, por si hubo un typo. */
  public onTryAnotherEmail(): void {
    this.sent = false;
    this.demoToken = null;
    this.emailSent = false;
    this.form.reset();
  }

  /**
   * URL completa del enlace de recuperacion, solo para MOSTRARLA como texto en
   * el bloque demo y que se vea que forma tendria el enlace real del correo.
   *
   * La navegacion NO usa esta cadena: el bloque demo lleva un routerLink, que
   * navega dentro de la aplicacion sin recargar la pagina. La diferencia
   * importa aqui: pegar esta URL en la barra de direcciones provoca una peticion
   * HTTP a /restablecer, y para que eso funcione el servidor tiene que estar
   * configurado para devolver index.html en cualquier ruta. `ng serve` lo hace
   * solo, pero un hosting de archivos estaticos sin esa regla devolveria 404.
   * Con routerLink el problema no existe porque nunca se sale de la pagina.
   */
  public get demoResetUrl(): string {
    return `${window.location.origin}/restablecer?token=${this.demoToken}`;
  }
}
