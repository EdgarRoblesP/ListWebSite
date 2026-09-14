import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { LoginComponent } from './pages/login/login.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { RegisterComponent } from './pages/register/register.component';
import { CompleteRegistrationComponent } from './pages/complete-registration/complete-registration.component';
import { TasksPageComponent } from './pages/tasks-page/tasks-page.component';

export const routes: Routes = [
  /* Frame 1:3 de Figma. guestGuard evita volver aqui con la sesion abierta. */
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard],
    title: 'Inicio de sesion'
  },

  /* Frame 9:18: pedir el correo para recibir las instrucciones. */
  {
    path: 'recuperar',
    component: ForgotPasswordComponent,
    canActivate: [guestGuard],
    title: 'Recuperar contrasena'
  },

  /* Frame 9:42: escribir la contrasena nueva. Sin guestGuard a proposito:
     ver el comentario en guards/auth.guard.ts. */
  {
    path: 'restablecer',
    component: ResetPasswordComponent,
    title: 'Restablecer contrasena'
  },

  /* Registro: nueva vista exigida por el contrato. */
  {
    path: 'registro',
    component: RegisterComponent,
    canActivate: [guestGuard],
    title: 'Registro'
  },
  {
    path: 'completar-registro',
    component: CompleteRegistrationComponent,
    title: 'Completar registro'
  },

  /* La aplicacion original. Ahora exige sesion. */
  {
    path: 'tareas',
    component: TasksPageComponent,
    canActivate: [authGuard],
    title: 'Mis tareas'
  },

  /* Raiz: se decide en el guardian. Si hay sesion, guestGuard manda a /tareas;
     si no, se queda en el login. */
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  /* Comodin para cualquier URL desconocida. Evita la pantalla en blanco. */
  { path: '**', redirectTo: 'login' }
];
