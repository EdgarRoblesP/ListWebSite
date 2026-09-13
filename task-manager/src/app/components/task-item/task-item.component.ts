import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subtask, Task } from '../../models/task.model';
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
  @ViewChild('subtaskInput') public subtaskInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('editSubtaskInput') public editSubtaskInputRef?: ElementRef<HTMLInputElement>;

  public isEditing: boolean = false;
  public editTitle: string = '';

  // Subtareas - Estado SSD
  public isAddingSubtask: boolean = false;
  public newSubtaskTitle: string = '';
  public editingSubtaskId: number | null = null;
  public editSubtaskTitle: string = '';

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

  // ── Getters progreso subtareas (FR-06, FR-10) ──
  public get subtaskCount(): number {
    return this.task.subtasks?.length ?? 0;
  }

  public get completedSubtaskCount(): number {
    return this.task.subtasks?.filter(s => s.completed).length ?? 0;
  }

  public get subtaskProgress(): number {
    if (this.subtaskCount === 0) return 0;
    return Math.round((this.completedSubtaskCount / this.subtaskCount) * 100);
  }

  // ── Agregar subtarea (FR-01) ──
  public toggleAddSubtask(event?: MouseEvent): void {
    event?.stopPropagation();
    this.isAddingSubtask = !this.isAddingSubtask;
    if (this.isAddingSubtask) {
      this.newSubtaskTitle = '';
      setTimeout(() => {
        this.subtaskInputRef?.nativeElement.focus();
      }, 0);
    }
  }

  public onAddSubtask(): void {
    const trimmed = this.newSubtaskTitle.trim();
    if (!trimmed) return;
    this.taskService.addSubtask(this.task.id, trimmed);
    this.newSubtaskTitle = '';
    // Mantener abierto para agregar múltiples (FR-03) - no cerrar automáticamente
    setTimeout(() => this.subtaskInputRef?.nativeElement.focus(), 0);
  }

  public onSubtaskInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.isAddingSubtask = false;
      this.newSubtaskTitle = '';
    }
  }

  // ── Toggle subtarea (FR-04) ──
  public onToggleSubtask(subtask: Subtask, event?: Event): void {
    event?.stopPropagation();
    this.taskService.toggleSubtask(this.task.id, subtask.id);
  }

  // ── Editar subtarea (FR-07) ──
  public startEditSubtask(subtask: Subtask, event?: MouseEvent): void {
    event?.stopPropagation();
    this.editingSubtaskId = subtask.id;
    this.editSubtaskTitle = subtask.title;
    setTimeout(() => {
      this.editSubtaskInputRef?.nativeElement.focus();
      this.editSubtaskInputRef?.nativeElement.select();
    }, 0);
  }

  public saveEditSubtask(): void {
    if (this.editingSubtaskId !== null) {
      const trimmed = this.editSubtaskTitle.trim();
      if (trimmed) {
        this.taskService.updateSubtaskTitle(this.task.id, this.editingSubtaskId, trimmed);
      }
      this.editingSubtaskId = null;
      this.editSubtaskTitle = '';
    }
  }

  public cancelEditSubtask(): void {
    this.editingSubtaskId = null;
    this.editSubtaskTitle = '';
  }

  // ── Eliminar subtarea (FR-08) ──
  public onDeleteSubtask(subtaskId: number, event?: MouseEvent): void {
    event?.stopPropagation();
    this.taskService.deleteSubtask(this.task.id, subtaskId);
  }
}
