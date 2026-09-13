import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TaskCounterComponent } from '../../components/task-counter/task-counter.component';
import { TaskFilterComponent } from '../../components/task-filter/task-filter.component';
import { TaskInputComponent } from '../../components/task-input/task-input.component';
import { TaskListComponent } from '../../components/task-list/task-list.component';
import { AuthService } from '../../services/auth.service';

/**
 * =============================================================================
 * PANTALLA DE TAREAS
 * -----------------------------------------------------------------------------
 * PASO 1 del plan de implementacion.
 *
 * Este componente es el antiguo AppComponent movido tal cual. La plantilla y
 * los estilos son los mismos que habia en app.component.html y
 * app.component.css; lo unico anadido es la fila superior con el nombre del
 * usuario y el boton de cerrar sesion, que antes no tenia sentido porque no
 * existia el concepto de sesion.
 *
 * Se llega aqui solo a traves de authGuard, asi que currentUser() nunca es
 * null cuando la plantilla se dibuja.
 * =============================================================================
 */
@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [
    CommonModule,
    TaskCounterComponent,
    TaskInputComponent,
    TaskFilterComponent,
    TaskListComponent
  ],
  templateUrl: './tasks-page.component.html',
  styleUrls: ['./tasks-page.component.css']
})
export class TasksPageComponent {
  /* inject() en lugar del constructor: es el estilo recomendado en Angular
     moderno y deja las dependencias visibles como campos de la clase. */
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  public appTitle = 'Lista de Tareas';
  public appSubtitle = 'Practica 2 - Mantenimiento de Software';

  /** Signal del usuario autenticado; la plantilla lo lee como currentUser(). */
  public readonly currentUser = this.auth.currentUser;

  /**
   * Cierra la sesion y vuelve al login.
   *
   * No hace falta limpiar las tareas a mano: TaskService escucha el signal de
   * usuario con un effect() y vacia la lista automaticamente al pasar a null.
   */
  public onLogout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
