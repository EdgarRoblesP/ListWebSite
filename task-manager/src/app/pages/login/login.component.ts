import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * =============================================================================
 * PANTALLA DE INICIO DE SESION - Frame 1:3 de Figma
 * -----------------------------------------------------------------------------
 * PASO 5.1 del plan de implementacion.
 *
 * POR QUE REACTIVE FORMS Y NO FORMSMODULE
 * El resto de la aplicacion (task-input, task-item) usa formularios de
 * plantilla con [(ngModel)], que van bien para un unico campo de texto. Estas
 * tres pantallas usan Reactive Forms porque necesitan:
 *   - validacion declarativa (requerido, formato de correo, longitud minima),
 *   - saber si un campo fue "tocado" para no mostrar errores al cargar,
 *   - deshabilitar el formulario entero mientras hay una peticion en curso,
 *   - y en el frame 9:42, un validador que compara dos campos entre si.
 * Con ngModel todo eso se hace a mano en el componente.
 *
 * LOS TRES ESTADOS DE LA PANTALLA
 * submitting  -> hay una peticion en vuelo; el boton se desactiva.
 * errorMessage -> el servidor rechazo las credenciales.
 * (sin estado) -> el formulario espera datos.
 * =============================================================================
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  /* La hoja compartida va primero para que el CSS propio pueda sobrescribirla
     si hace falta. Ver shared/auth-card.css. */
  styleUrls: ['../../shared/auth-card.css', './login.component.css']
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  /* Credenciales del usuario semilla, que se muestran en pantalla porque no
     hay registro. Se leen de la constante del servicio para que no se queden
     desincronizadas si alguien las cambia alli. */
  public readonly demoEmail = AuthService.DEMO_USER.email;
  public readonly demoPassword = AuthService.DEMO_USER.password;

  /**
   * Controla si se muestra el bloque de ayuda con las credenciales de prueba.
   *
   * POR QUE SOLO EN LOCAL
   * Ese bloque existe porque no hay pantalla de registro: sin el seria imposible
   * entrar la primera vez. Pero enseña en pantalla un correo real junto a una
   * contrasena valida, asi que en un despliegue publico cualquiera que abra la
   * pagina podria entrar con esa cuenta. En local no hay nadie mas mirando.
   *
   * Se comprueba el hostname y no un fichero de entorno de Angular porque la
   * distincion que importa aqui no es "build de desarrollo o de produccion"
   * —Vercel compila en modo produccion igualmente— sino "quien puede ver esta
   * pantalla". El valor se calcula una sola vez al crear el componente.
   *
   * Cuando exista registro de usuarios, este bloque y esta bandera se borran.
   */
  public readonly showDemoCredentials =
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

  public submitting = false;
  public errorMessage: string | null = null;

  /**
   * Definicion del formulario. Los validadores viven aqui, no en la plantilla:
   * asi la regla de negocio es unica y comprobable.
   */
  public readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  /* Atajos para que la plantilla no repita form.controls.email una y otra vez. */
  public get email() {
    return this.form.controls.email;
  }

  public get password() {
    return this.form.controls.password;
  }

  /**
   * Regla comun a las tres pantallas: un error de campo se muestra solo si el
   * campo es invalido Y el usuario ya interactuo con el. Sin la segunda
   * condicion, la pantalla apareceria en rojo antes de escribir nada.
   */
  public showError(controlName: 'email' | 'password'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  public onSubmit(): void {
    /* Si el formulario es invalido se marcan todos los campos como tocados
       para que aparezcan sus mensajes de error de golpe. Es la respuesta
       correcta a alguien que pulsa Enter con el formulario vacio. */
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    /* Guarda contra el doble envio: sin esto, dos clics rapidos lanzan dos
       peticiones. Importa mas cuando hay red de verdad. */
    if (this.submitting) {
      return;
    }

    this.submitting = true;
    this.errorMessage = null;

    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: () => {
        /* authGuard guarda la URL a la que el usuario queria ir en el
           parametro redirectTo. Si existe se respeta; si no, a /tareas. */
        const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');
        this.router.navigateByUrl(redirectTo ?? '/tareas');
      },
      error: (error: Error) => {
        this.errorMessage = error.message;
        this.submitting = false;
      }
    });
  }
}
