import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-agenda-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './agenda-manager.component.html',
  styleUrl: './agenda-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgendaManagerComponent {
  @Input({ required: true }) agenda!: FormArray<FormGroup>;
  @Input() maxTieBreakersEnabled = true;
  @Output() addTopicRequested = new EventEmitter<void>();
  @Output() removeTopicRequested = new EventEmitter<number>();

  constructor(private readonly fb: FormBuilder) {}

  protected drop(event: CdkDragDrop<FormGroup[]>): void {
    if (!this.agenda || event.previousIndex === event.currentIndex) {
      return;
    }

    const item = this.agenda.at(event.previousIndex);
    this.agenda.removeAt(event.previousIndex);
    this.agenda.insert(event.currentIndex, item);
  }

  protected questions(topic: FormGroup): FormArray<FormGroup> {
    return topic.get('questions') as FormArray<FormGroup>;
  }

  protected addQuestion(topic: FormGroup): void {
    this.questions(topic).push(this.buildQuestionGroup());
  }

  protected removeQuestion(topic: FormGroup, index: number): void {
    const questions = this.questions(topic);
    questions.removeAt(index);
    if (!questions.length) {
      questions.push(this.buildQuestionGroup());
    }
  }

  protected topicLabel(index: number, topic: FormGroup): string {
    const title = topic.get('title')?.value as string | undefined;
    return title?.trim() ? `${index + 1}. ${title}` : `Topic ${index + 1}`;
  }

  protected trackByIndex(index: number): number {
    return index;
  }

  private buildQuestionGroup(): FormGroup {
    return this.fb.nonNullable.group({
      id: [this.generateQuestionId()],
      text: ['', [Validators.required, Validators.maxLength(280)]],
      description: ['', Validators.maxLength(400)],
      startAt: [''],
      endAt: [''],
      allowsTieBreaker: [true],
      status: ['PLND'],
    });
  }

  private generateQuestionId(): string {
    return `question-${Math.random().toString(36).slice(2, 8)}`;
  }
}
