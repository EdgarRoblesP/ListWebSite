import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Validador que obliga a que contraseña y confirmación coincidan.
 * Se declara fuera de la clase para no acoplar la validación al componente
 * y se aplica al FormGroup, porque un validador de control solo ve su propio valor.
 */
export function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (!confirmPassword) return null;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

/**
 * =============================================================================
 * PANTALLA "COMPLETAR REGISTRO" - configura la contraseña tras el email
 * -----------------------------------------------------------------------------
 * QUE HACE ESTE ARCHIVO
 * Segundo paso del registro: el usuario llega aqui desde el enlace enviado por
 * correo (`/completar-registro?token=...`). Valida el token ANTES de mostrar el
 * formulario (4 estados: validating, tokenError, done, form) y permite elegir una
 * contraseña de minimo 8 caracteres que se guarda hasheada en `usuarios.txt`.
 *
 * POR QUE EXISTE
 * El contrato exige que la contraseña se configure mediante el enlace enviado por
 * correo, no en la propia vista de Registro. Reutiliza el mismo patron de
 * Restablecer contraseña (validacion de token con TTL y un solo uso) pero crea
 * un usuario nuevo en lugar de actualizar uno existente.
 *
 * SEGURIDAD
 * - El token se valida al entrar y de nuevo al guardar (puede caducar entre medias).
 * - La contraseña se hashea con SHA-256 antes de persistir (UserStorageService).
 * - El enlace es de un solo uso: al completar, se marca usedAt.
 * =============================================================================
 */
@Component({
  selector: 'app-complete-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './complete-registration.component.html',
  styleUrls: ['../../shared/auth-card.css', './complete-registration.component.css']
})
export class CompleteRegistrationComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  public readonly minPasswordLength = AuthService.MIN_PASSWORD_LENGTH;
  public validating = true;
  public tokenError: string | null = null;
  public submitting = false;
  public errorMessage: string | null = null;
  public done = false;
  public accountEmail = '';
  private token: string | null = null;

  public readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(AuthService.MIN_PASSWORD_LENGTH)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: passwordsMatchValidator }
  );

  public get password() { return this.form.controls.password; }
  public get confirmPassword() { return this.form.controls.confirmPassword; }

  public ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.validating = false;
      this.tokenError = 'Este enlace no incluye un código de registro. Solicita uno nuevo desde Registro.';
      return;
    }
    this.auth.validateRegistrationToken(this.token).subscribe({
      next: (email: string) => { this.accountEmail = email; this.validating = false; },
      error: (error: Error) => { this.tokenError = error.message; this.validating = false; }
    });
  }

  public showError(controlName: 'password' | 'confirmPassword'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  public showMismatchError(): boolean {
    return this.form.hasError('passwordMismatch') && (this.confirmPassword.touched || this.confirmPassword.dirty);
  }

  public onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.submitting || !this.token) return;
    this.submitting = true;
    this.errorMessage = null;
    const { password } = this.form.getRawValue();
    this.auth.completeRegistration(this.token, password).subscribe({
      next: () => { this.submitting = false; this.done = true; },
      error: (error: Error) => { this.submitting = false; this.errorMessage = error.message; }
    });
  }

  public onGoToLogin(): void { this.router.navigate(['/login']); }
}
