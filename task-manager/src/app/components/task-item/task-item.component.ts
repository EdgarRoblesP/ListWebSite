import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../models/task.model';
import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-task-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-item.component.html',
  styleUrls: ['./task-item.component.css']
})
export class TaskItemComponent {
  @Input({ required: true }) public task!: Task;
  @ViewChild('editInput') public editInputRef?: ElementRef<HTMLInputElement>;

  public isEditing: boolean = false;
  public editTitle: string = '';

  constructor(private taskService: TaskService) {}

  public onToggle(): void {
    if (!this.isEditing) {
      this.taskService.toggleTask(this.task.id);
    }
  }

  public startEdit(event?: MouseEvent): void {
    event?.stopPropagation(); 
    this.isEditing = true;
    this.editTitle = this.task.title;
    setTimeout(() => {
      this.editInputRef?.nativeElement.focus();
      this.editInputRef?.nativeElement.select();
    }, 0);
  }


  public saveEdit(): void {
    if (this.isEditing) {
      const trimmed = this.editTitle.trim();
      if (trimmed && trimmed !== this.task.title) {
        this.taskService.updateTaskTitle(this.task.id, trimmed);
      }
      this.isEditing = false;
    }
  }

  public cancelEdit(): void {
    this.isEditing = false;
    this.editTitle = this.task.title;
  }

  public onDelete(event: MouseEvent): void {
    event.stopPropagation();
    this.taskService.deleteTask(this.task.id);
  }
}
