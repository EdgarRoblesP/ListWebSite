import { Injectable, effect, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { Subtask, Task, TaskFilterType } from '../models/task.model';
import { AuthService } from './auth.service';

/**
 * =============================================================================
 * TASK SERVICE
 * -----------------------------------------------------------------------------
 * Dos capas de trabajo conviven en este archivo:
 *
 *   1. Persistencia por usuario en localStorage, con la lista enlazada a la
 *      sesion mediante un effect() sobre AuthService.currentUser.
 *   2. Gestion de subtareas segun la especificacion SSD_Subtareas: agregar,
 *      completar, editar y eliminar subtareas dentro de una tarea padre, con
 *      sincronizacion automatica del estado del padre.
 *
 * COMO SE ENLAZA CON LA SESION
 * El servicio no expone ningun metodo "cargar tareas del usuario X". Un
 * effect() observa el signal currentUser y recarga la lista cuando cambia:
 * al iniciar sesion aparecen las tareas de esa cuenta, al cerrarla la lista se
 * vacia. Los componentes no se enteran.
 *
 * TODAS LAS MUTACIONES TERMINAN EN commit()
 * commit() publica el estado nuevo y lo guarda. Centralizarlo evita el error
 * de anadir una operacion y acordarse de notificar pero olvidarse de persistir.
 * =============================================================================
 */
@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly auth = inject(AuthService);

  /** Prefijo de la clave; se completa con el correo del usuario. */
  private static readonly TASKS_KEY_PREFIX = 'app.tasks.';

  /**
   * Tareas de ejemplo con las que se estrena una cuenta nueva.
   *
   * Se copian la primera vez que un usuario entra y desde ese momento su lista
   * es suya. Si el usuario las borra todas, no vuelven a aparecer, porque lo
   * que se guarda es una lista vacia, no la ausencia de datos.
   */
  private static readonly SEED_TASKS: Task[] = [
    {
      id: 1,
      title: 'Revisar apuntes de la clase',
      completed: true,
      createdAt: new Date('2026-08-28T09:00:00'),
      subtasks: []
    },
    {
      id: 2,
      title: 'Subir codigo de la practica 2 al repositorio',
      completed: false,
      createdAt: new Date('2026-08-29T11:30:00'),
      subtasks: [
        {
          id: 1,
          taskId: 2,
          title: 'Hacer commit de los cambios locales',
          completed: false,
          createdAt: new Date('2026-08-30T10:00:00')
        },
        {
          id: 2,
          taskId: 2,
          title: 'Escribir mensaje de commit descriptivo',
          completed: false,
          createdAt: new Date('2026-08-30T10:05:00')
        }
      ]
    },
    {
      id: 3,
      title: 'Preparar exposicion del proyecto',
      completed: false,
      createdAt: new Date('2026-08-30T14:15:00'),
      subtasks: []
    }
  ];

  private tasks: Task[] = [];
  private nextId = 1;

  /**
   * Contador de ids de subtarea.
   *
   * Los ids de subtarea son unicos en TODA la lista, no dentro de cada tarea.
   * Podrian ser unicos solo por tarea, ya que siempre se buscan pasando tambien
   * el taskId, pero un id global evita confusiones al depurar y es lo que
   * esperaria una tabla con clave primaria propia.
   */
  private nextSubtaskId = 1;

  private tasksSubject = new BehaviorSubject<Task[]>([]);
  private filterSubject = new BehaviorSubject<TaskFilterType>('all');

  public tasks$: Observable<Task[]> = this.tasksSubject.asObservable();
  public filter$: Observable<TaskFilterType> = this.filterSubject.asObservable();

  public filteredTasks$: Observable<Task[]> = combineLatest([
    this.tasks$,
    this.filter$
  ]).pipe(
    map(([tasks, filter]) => this.filterTasks(tasks, filter))
  );

  constructor() {
    /* El enlace entre sesion y datos. Se declara en el constructor porque
       effect() necesita un contexto de inyeccion, y se ejecuta una primera vez
       de inmediato: si al arrancar ya habia sesion guardada, las tareas se
       cargan sin esperar a nada. */
    effect(() => {
      const user = this.auth.currentUser();
      this.loadTasksFor(user?.email ?? null);
    });
  }

  public get currentFilter(): TaskFilterType {
    return this.filterSubject.value;
  }

  public setFilter(filter: TaskFilterType): void {
    this.filterSubject.next(filter);
  }

  /* ==========================================================================
     TAREAS
     ========================================================================== */

  public addTask(title: string): void {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    const newTask: Task = {
      id: this.nextId++,
      title: trimmedTitle,
      completed: false,
      createdAt: new Date(),
      subtasks: []
    };

    this.tasks = [newTask, ...this.tasks];
    this.commit();
  }

  public toggleTask(id: number): void {
    this.tasks = this.tasks.map(task => {
      if (task.id === id) {
        return { ...task, completed: !task.completed };
      }
      return task;
    });
    this.commit();
  }

  public updateTaskTitle(id: number, newTitle: string): void {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      return;
    }

    this.tasks = this.tasks.map(task => {
      if (task.id === id) {
        return { ...task, title: trimmedTitle };
      }
      return task;
    });

    this.commit();
  }

  public deleteTask(id: number): void {
    const index = this.tasks.findIndex(task => task.id === id);
    if (index !== -1) {
      this.tasks.splice(index, 1);
      this.commit();
    }
  }

  /* ==========================================================================
     SUBTAREAS (especificacion SSD_Subtareas)
     --------------------------------------------------------------------------
     Las cuatro operaciones siguen el mismo patron: recorren la lista, localizan
     la tarea padre por id y devuelven una copia nueva con el arreglo subtasks
     modificado. Nunca se muta el objeto original, porque los componentes
     comparan referencias para decidir si repintan.
     ========================================================================== */

  /** Agrega una subtarea a la tarea indicada. */
  public addSubtask(taskId: number, title: string): void {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    const newSubtask: Subtask = {
      id: this.nextSubtaskId++,
      taskId,
      title: trimmed,
      completed: false,
      createdAt: new Date()
    };

    this.tasks = this.tasks.map(task =>
      task.id === taskId
        ? { ...task, subtasks: [...task.subtasks, newSubtask] }
        : task
    );

    this.commit();
  }

  /**
   * Marca o desmarca una subtarea y recalcula el estado de la tarea padre.
   */
  public toggleSubtask(taskId: number, subtaskId: number): void {
    this.tasks = this.tasks.map(task => {
      if (task.id !== taskId) {
        return task;
      }

      const updatedSubtasks = task.subtasks.map(subtask =>
        subtask.id === subtaskId
          ? { ...subtask, completed: !subtask.completed }
          : subtask
      );

      return this.syncParentCompletion({ ...task, subtasks: updatedSubtasks });
    });

    this.commit();
  }

  public updateSubtaskTitle(taskId: number, subtaskId: number, newTitle: string): void {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      return;
    }

    this.tasks = this.tasks.map(task => {
      if (task.id !== taskId) {
        return task;
      }

      const updatedSubtasks = task.subtasks.map(subtask =>
        subtask.id === subtaskId ? { ...subtask, title: trimmed } : subtask
      );

      return { ...task, subtasks: updatedSubtasks };
    });

    this.commit();
  }

  /**
   * Elimina una subtarea y vuelve a sincronizar el padre.
   *
   * Si era la ultima, syncParentCompletion no hace nada y la tarea conserva el
   * estado que tuviera: una tarea sin subtareas vuelve a depender solo de su
   * propio checkbox.
   */
  public deleteSubtask(taskId: number, subtaskId: number): void {
    this.tasks = this.tasks.map(task => {
      if (task.id !== taskId) {
        return task;
      }

      const remaining = task.subtasks.filter(subtask => subtask.id !== subtaskId);
      return this.syncParentCompletion({ ...task, subtasks: remaining });
    });

    this.commit();
  }

  /**
   * Regla de la especificacion: el estado del padre lo mandan sus subtareas.
   *
   *   - Todas completadas  -> la tarea padre se marca completada.
   *   - Alguna pendiente   -> la tarea padre se desmarca.
   *
   * Una tarea sin subtareas se devuelve intacta, porque en ese caso no hay nada
   * que deduzca su estado y manda el checkbox del usuario.
   */
  private syncParentCompletion(task: Task): Task {
    if (task.subtasks.length === 0) {
      return task;
    }

    const allCompleted = task.subtasks.every(subtask => subtask.completed);

    if (allCompleted !== task.completed) {
      return { ...task, completed: allCompleted };
    }

    return task;
  }

  private filterTasks(tasks: Task[], filter: TaskFilterType): Task[] {
    switch (filter) {
      case 'pending':
        return tasks.filter(task => !task.completed);
      case 'completed':
        return tasks.filter(task => task.completed);
      case 'all':
      default:
        return tasks;
    }
  }

  /* ==========================================================================
     PERSISTENCIA
     ========================================================================== */

  /** Publica el estado actual y lo guarda. */
  private commit(): void {
    this.tasksSubject.next([...this.tasks]);
    this.saveTasks();
  }

  /**
   * Carga las tareas del usuario indicado, o vacia la lista si es null
   * (sesion cerrada).
   */
  private loadTasksFor(email: string | null): void {
    if (email === null) {
      this.tasks = [];
      this.nextId = 1;
      this.nextSubtaskId = 1;
      this.tasksSubject.next([]);
      return;
    }

    const stored = this.readTasks(email);

    /* null significa "esta cuenta nunca ha guardado nada" y se siembra con los
       ejemplos. Una lista vacia significa "el usuario borro todas sus tareas"
       y se respeta. Distinguir los dos casos es el motivo de que readTasks
       devuelva null y no un arreglo vacio. */
    this.tasks = stored ?? TaskService.cloneSeedTasks();

    /* Los dos contadores se deducen del maximo existente. Guardarlos aparte
       seria mas fragil: si se desincronizaran del contenido real, se repetirian
       ids y las operaciones por id afectarian al elemento equivocado. */
    this.nextId = this.tasks.reduce((max, task) => Math.max(max, task.id), 0) + 1;
    this.nextSubtaskId =
      this.tasks.reduce(
        (max, task) =>
          task.subtasks.reduce((inner, subtask) => Math.max(inner, subtask.id), max),
        0
      ) + 1;

    this.tasksSubject.next([...this.tasks]);

    /* Si se acaban de sembrar los ejemplos, se guardan de inmediato para que
       la proxima carga ya lea datos reales de esta cuenta. */
    if (stored === null) {
      this.saveTasks();
    }
  }

  /**
   * Copia profunda de las tareas de ejemplo.
   *
   * Una copia superficial compartiria el arreglo subtasks con la constante
   * estatica, y entonces las subtareas de ejemplo serian el mismo objeto para
   * todas las cuentas nuevas.
   */
  private static cloneSeedTasks(): Task[] {
    return TaskService.SEED_TASKS.map(task => ({
      ...task,
      subtasks: task.subtasks.map(subtask => ({ ...subtask }))
    }));
  }

  private storageKey(email: string): string {
    return TaskService.TASKS_KEY_PREFIX + email;
  }

  /**
   * @returns las tareas guardadas, o null si esta cuenta no tiene nada
   *          almacenado todavia.
   */
  private readTasks(email: string): Task[] | null {
    try {
      const raw = localStorage.getItem(this.storageKey(email));
      if (raw === null) {
        return null;
      }

      const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;

      return parsed.map(task => this.reviveTask(task));
    } catch {
      /* JSON corrupto o almacenamiento bloqueado: se trata como cuenta nueva
         en lugar de dejar la aplicacion inservible. */
      return null;
    }
  }

  /**
   * Reconstruye una tarea leida del almacenamiento.
   *
   * Hace dos cosas que parecen menores y no lo son:
   *
   * 1. MIGRACION. Las tareas guardadas antes de que existieran las subtareas no
   *    tienen el campo `subtasks`. Como el modelo lo declara obligatorio, si no
   *    se rellenara aqui la plantilla intentaria recorrer undefined y la
   *    pantalla se romperia al abrir una cuenta antigua.
   *
   * 2. FECHAS. JSON no tiene tipo fecha: al guardar, los Date se convierten en
   *    cadenas ISO. Hay que reconstruirlos porque el modelo los declara como
   *    Date y el pipe `date` de la plantilla espera un Date.
   */
  private reviveTask(raw: Record<string, unknown>): Task {
    const rawSubtasks = Array.isArray(raw['subtasks']) ? raw['subtasks'] : [];

    return {
      id: raw['id'] as number,
      title: raw['title'] as string,
      completed: raw['completed'] as boolean,
      createdAt: new Date(raw['createdAt'] as string),
      subtasks: (rawSubtasks as Array<Record<string, unknown>>).map(subtask => ({
        id: subtask['id'] as number,
        taskId: subtask['taskId'] as number,
        title: subtask['title'] as string,
        completed: subtask['completed'] as boolean,
        createdAt: new Date(subtask['createdAt'] as string)
      }))
    };
  }

  private saveTasks(): void {
    const email = this.auth.currentUser()?.email;

    /* Sin sesion no hay donde guardar. */
    if (!email) {
      return;
    }

    try {
      localStorage.setItem(this.storageKey(email), JSON.stringify(this.tasks));
    } catch {
      /* Almacenamiento lleno o bloqueado: la aplicacion sigue funcionando en
         memoria, pero los cambios no persisten ante una recarga. */
    }
  }
}
