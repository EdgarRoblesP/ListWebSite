import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Validador de GRUPO: comprueba que los dos campos de contrasena coincidan.
 * -----------------------------------------------------------------------------
 * Va fuera de la clase porque no necesita nada del componente, y se aplica al
 * FormGroup y no a un control individual: un validador de control solo ve su
 * propio valor, y aqui hay que comparar dos.
 *
 * Esta es la razon concreta por la que estas pantallas usan Reactive Forms en
 * lugar del [(ngModel)] que usa el resto de la aplicacion. Con formularios de
 * plantilla esta comparacion habria que escribirla a mano en el componente y
 * sincronizarla con el estado del formulario.
 *
 * Devuelve null cuando todo esta bien (asi funciona la API de validadores de
 * Angular) o el objeto { passwordMismatch: true } cuando no coinciden.
 */
export function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;

  /* Mientras la confirmacion este vacia no se reporta discrepancia: de eso ya
     se encarga su propio validador `required`. Si no, el usuario veria
     "las contrasenas no coinciden" nada mas escribir la primera letra. */
  if (!confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
}

/**
 * =============================================================================
 * PANTALLA "RESTABLECER CONTRASENA" - Frame 9:42 de Figma
 * -----------------------------------------------------------------------------
 * PASO 5.3 del plan de implementacion.
 *
 * Segundo paso del flujo: se llega aqui desde el enlace de recuperacion, que
 * trae el token en la URL (/restablecer?token=...).
 *
 * LOS CUATRO ESTADOS DE LA PANTALLA
 * Esta pantalla no puede mostrar el formulario sin mas, porque depende de algo
 * externo (el token). De ahi que tenga cuatro estados distintos:
 *
 *   1. validating = true  -> comprobando el token al entrar. Se muestra un
 *                            aviso de carga.
 *   2. tokenError != null -> el token falta, caduco o ya se uso. Se muestra el
 *                            motivo y un enlace para pedir otro enlace. NO se
 *                            muestra el formulario: seria cruel dejar que
 *                            alguien escriba una contrasena que va a ser
 *                            rechazada al enviarla.
 *   3. done = true        -> contrasena cambiada. Confirmacion y salida al
 *                            login.
 *   4. resto              -> el formulario del diseno.
 *
 * El estado 1 existe porque validateResetToken devuelve un Observable. Podria
 * haberse implementado como comprobacion sincrona contra localStorage, pero
 * entonces el dia que esa validacion sea una llamada HTTP habria que rehacer
 * la pantalla. Ver la nota sobre la regla de oro en auth.service.ts.
 * =============================================================================
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrls: ['../../shared/auth-card.css', './reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  /** Se expone a la plantilla para que el mensaje de ayuda y el validador no
      puedan decir longitudes distintas. */
  public readonly minPasswordLength = AuthService.MIN_PASSWORD_LENGTH;

  public validating = true;
  public tokenError: string | null = null;
  public submitting = false;
  public errorMessage: string | null = null;
  public done = false;

  /** Correo dueno del token; se muestra para que el usuario sepa que cuenta
      esta modificando. */
  public accountEmail = '';

  private token: string | null = null;

  public readonly form = this.fb.nonNullable.group(
    {
      password: [
        '',
        [Validators.required, Validators.minLength(AuthService.MIN_PASSWORD_LENGTH)]
      ],
      confirmPassword: ['', [Validators.required]]
    },
    /* El validador de grupo se registra aqui, en las opciones del group(). */
    { validators: passwordsMatchValidator }
  );

  public get password() {
    return this.form.controls.password;
  }

  public get confirmPassword() {
    return this.form.controls.confirmPassword;
  }

  /**
   * PASO CLAVE: validar el token ANTES de dibujar el formulario.
   *
   * Se lee del snapshot y no del observable queryParamMap porque el token no
   * cambia mientras la pantalla esta abierta: llegar aqui con otro token
   * implica una navegacion nueva.
   */
  public ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');

    /* Caso 1: ni siquiera hay token. Ocurre si alguien escribe /restablecer a
       mano. Se resuelve sin llamar al servicio. */
    if (!this.token) {
      this.validating = false;
      this.tokenError =
        'Este enlace no incluye un codigo de recuperacion. Solicita uno nuevo.';
      return;
    }

    /* Caso 2: hay token; que el servicio diga si sirve. */
    this.auth.validateResetToken(this.token).subscribe({
      next: (email: string) => {
        this.accountEmail = email;
        this.validating = false;
      },
      error: (error: Error) => {
        this.tokenError = error.message;
        this.validating = false;
      }
    });
  }

  /** Un error de campo se muestra solo si el usuario ya interactuo con el. */
  public showError(controlName: 'password' | 'confirmPassword'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  /**
   * El error de discrepancia vive en el GRUPO, no en un campo, asi que se
   * consulta aparte. Se muestra bajo la confirmacion y solo cuando ese campo
   * ya fue tocado.
   */
  public showMismatchError(): boolean {
    return (
      this.form.hasError('passwordMismatch') &&
      (this.confirmPassword.touched || this.confirmPassword.dirty)
    );
  }

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.submitting || !this.token) {
      return;
    }

    this.submitting = true;
    this.errorMessage = null;

    const { password } = this.form.getRawValue();

    this.auth.resetPassword(this.token, password).subscribe({
      next: () => {
        this.submitting = false;
        this.done = true;
      },
      error: (error: Error) => {
        /* Si el fallo es del token (caduco entre la carga y el envio) se
           bloquea la pantalla igual que en ngOnInit, porque reintentar con el
           mismo token no va a funcionar. El resto de errores se muestran
           sobre el formulario, que sigue disponible. */
        this.submitting = false;
        this.errorMessage = error.message;
      }
    });
  }

  /** Lleva al login tras el cambio de contrasena. */
  public onGoToLogin(): void {
    this.router.navigate(['/login']);
  }
}
