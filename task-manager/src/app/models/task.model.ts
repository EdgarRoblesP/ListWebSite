export type TaskFilterType = 'all' | 'pending' | 'completed';

/**
 * Subtarea: una actividad mas pequena dentro de una tarea principal.
 *
 * Viene de la especificacion SSD_Subtareas. El campo `taskId` es redundante
 * mientras las subtareas vivan dentro del arreglo `Task.subtasks` —ya se sabe
 * a quien pertenecen por donde estan—, pero se conserva porque el dia que los
 * datos vayan a una base de datos relacional esa columna es justo la clave
 * foranea que las une a su tarea padre.
 */
export interface Subtask {
  id: number;
  taskId: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export interface Task {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;

  /**
   * Subtareas de esta tarea. Siempre es un arreglo, nunca undefined.
   *
   * Que el campo sea obligatorio obliga a que TaskService rellene las tareas
   * antiguas guardadas en localStorage, que se escribieron antes de que las
   * subtareas existieran. Esa migracion esta en TaskService.readTasks().
   */
  subtasks: Subtask[];
}
