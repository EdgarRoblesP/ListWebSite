import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-counter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-counter.component.html',
  styleUrls: ['./task-counter.component.css']
})
export class TaskCounterComponent implements OnInit, OnDestroy {
  public tasks: Task[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private taskService: TaskService) {}

  public ngOnInit(): void {
    this.subscription.add(
      this.taskService.tasks$.subscribe(taskList => {
        this.tasks = taskList;
      })
    );
  }

  public ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  public get pendingCount(): number {
    return this.tasks.filter(task => !task.completed).length;
  }

  public get totalCount(): number {
    return this.tasks.length;
  }
}
