import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PasswordResetResult } from '../../models/user.model';

/**
 * =============================================================================
 * PANTALLA DE REGISTRO - nueva vista exigida por el contrato
 * -----------------------------------------------------------------------------
 * QUE HACE ESTE ARCHIVO
 * Es el primer paso del flujo de registro: pide el correo electrónico y dispara
 * el envío del enlace de confirmación. Reutiliza la infraestructura de
 * recuperación (token UUID, TTL 15min, Resend via /api/send-register-email) pero
 * valida que el correo NO exista antes de generar el token, evitando duplicados.
 *
 * POR QUE EXISTE
 * Antes solo existía un usuario semilla sin forma de crear cuentas. El contrato
 * exige una vista "Registro" con título, campo email y botón Confirmar azul,
 * usando el mismo CSS `auth-card.css` que Login para que parezca parte de la
 * misma aplicación y no una página aislada.
 *
 * ESTADOS
 * - Formulario (sent=false): campo email + botón Confirmar.
 * - Confirmación (sent=true): mensaje "Revisa tu correo" + bloque Modo demo
 *   cuando el correo no se pudo enviar (ng serve). El token se muestra en
 *   pantalla solo en ese caso, igual que en ForgotPassword.
 *
 * MANEJO DE ERRORES
 * - Correo vacío / formato inválido: validación del Reactive Form.
 * - Correo ya registrado: el servicio devuelve error que se muestra en form-error.
 * - Error al enviar correo: no se propaga como error global; el token ya se
 *   generó y la pantalla recurre al bloque demo.
 * =============================================================================
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['../../shared/auth-card.css', './register.component.css']
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  public submitting = false;
  public errorMessage: string | null = null;
  public sent = false;
  public sentToEmail = '';
  public demoToken: string | null = null;
  public emailSent = false;

  public readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  public get email() { return this.form.controls.email; }

  public showEmailError(): boolean {
    return this.email.invalid && (this.email.touched || this.email.dirty);
  }

  public onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.submitting) return;
    this.submitting = true;
    this.errorMessage = null;
    const email = this.form.getRawValue().email.trim();
    this.auth.requestRegistration(email).subscribe({
      next: (result: PasswordResetResult) => {
        this.submitting = false;
        this.sent = true;
        this.sentToEmail = email;
        this.emailSent = result.emailSent;
        this.demoToken = result.token;
      },
      error: (error: Error) => {
        this.errorMessage = error.message;
        this.submitting = false;
      }
    });
  }

  public onTryAnotherEmail(): void {
    this.sent = false;
    this.demoToken = null;
    this.emailSent = false;
    this.form.reset();
  }

  public get demoRegisterUrl(): string {
    return `${window.location.origin}/completar-registro?token=${this.demoToken}`;
  }
}
