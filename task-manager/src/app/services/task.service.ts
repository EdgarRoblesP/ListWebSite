import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map } from 'rxjs';
import { Task, TaskFilterType } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private tasks: Task[] = [
    {
      id: 1,
      title: 'Revisar apuntes de la clase',
      completed: true,
      createdAt: new Date('2026-08-28T09:00:00')
    },
    {
      id: 2,
      title: 'Subir código de la práctica 2 al repositorio',
      completed: false,
      createdAt: new Date('2026-08-29T11:30:00')
    },
    {
      id: 3,
      title: 'Preparar exposición del proyecto',
      completed: false,
      createdAt: new Date('2026-08-30T14:15:00')
    }
  ];

  private tasksSubject = new BehaviorSubject<Task[]>(this.tasks);
  private filterSubject = new BehaviorSubject<TaskFilterType>('all');

  public tasks$: Observable<Task[]> = this.tasksSubject.asObservable();
  public filter$: Observable<TaskFilterType> = this.filterSubject.asObservable();

  public filteredTasks$: Observable<Task[]> = combineLatest([
    this.tasks$,
    this.filter$
  ]).pipe(
    map(([tasks, filter]) => this.filterTasks(tasks, filter))
  );

  private nextId = 4;

  public get currentFilter(): TaskFilterType {
    return this.filterSubject.value;
  }

  public setFilter(filter: TaskFilterType): void {
    this.filterSubject.next(filter);
  }

  public addTask(title: string): void {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    const newTask: Task = {
      id: this.nextId++,
      title: trimmedTitle,
      completed: false,
      createdAt: new Date()
    };

    this.tasks = [newTask, ...this.tasks];
    this.tasksSubject.next([...this.tasks]);
  }

  public toggleTask(id: number): void {
    this.tasks = this.tasks.map(task => {
      if (task.id === id) {
        return { ...task, completed: !task.completed };
      }
      return task;
    });
    this.tasksSubject.next([...this.tasks]);
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

    this.tasksSubject.next([...this.tasks]);
  }

  public deleteTask(id: number): void {
    const index = this.tasks.findIndex(task => task.id === id);
    if (index !== -1) {
      this.tasks.splice(index, 1);
      this.tasksSubject.next([...this.tasks]);
    }
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
}

