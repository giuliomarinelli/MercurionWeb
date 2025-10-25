import { CustomDetailSaveModel } from '../../../Models/custom-detail-save.model';
import { NgClass } from '@angular/common';
import {
  Component, ElementRef, EventEmitter, inject, Input, Output, Renderer2, signal, ViewChild, ChangeDetectionStrategy,
  effect
} from '@angular/core';
import { MoleculeBadgeComponent } from '../molecule-badge/molecule-badge.component';

@Component({
  selector: 'app-custom-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, MoleculeBadgeComponent],
  // l’host non introduce box extra nel layout del parent
  host: { 'class': 'contents' },
  styles: [`
    :host { display: contents; }
  `],
  template: `
    @switch (_type()) {

      @case ('cardName') {
      <div class="flex items-center gap-4 min-w-0">
        <div
          #value
          class="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100 truncate min-w-0"
          [attr.contenteditable]="mode() === 'edit' ? 'true' : null"
          [ngClass]="{
            'px-1 py-0.5 bg-slate-100 dark:bg-slate-700 border border-light-on-surface-main dark:border-dark-on-surface-main rounded-md': mode() === 'edit'
          }"
          title="{{ _value() }}"
        >
          {{ _value() }}
        </div>

        <app-molecule-badge class="shrink-0" [name]="_badgeName()" />
        @if (!_isReadonly()) {
          @if (mode() === 'view') {
            <!-- z-30: sopra l’overlay -->
            <button type="button"
                    class="ml-3 relative z-30 cursor-pointer transition-colors duration-300"
                    title="Modifica"
                    (click)="doEdit()">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                   class="h-6 w-auto fill-current text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75">
                <path d="M58.1 555.9L48 592C50.7 591.2 117.4 572.6 248 536L569.4 214.6L592 192C589.6 189.6 549.1 149.1 470.6 70.6L448 48L425.4 70.6L104 392L58.1 555.9zM252.7 486L154 387.3L347.4 193.9L446.1 292.6L252.7 486zM229.4 508L94.2 545.8L132 410.6L229.4 508zM546.7 192L468.6 270.1L369.9 171.4L448 93.3L546.7 192z"/>
              </svg>
            </button>
          } @else {
            <button type="button"
                    class="ml-3 relative z-30 cursor-pointer transition-colors duration-300"
                    title="Annulla"
                    (click)="doCancel()">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                   class="h-6 w-auto fill-current text-light-error hover:text-light-error/75 dark:text-dark-error dark:hover:text-dark-error/75">
                <path d="M507.4 155.3L518.8 144L496.1 121.4L484.8 132.7L320.1 297.4L155.4 132.7L144.1 121.4L121.5 144L132.8 155.3L297.5 320L132.8 484.7L121.5 496L144.1 518.6L155.4 507.3L320.1 342.6L484.8 507.3L496.1 518.6L518.8 496L507.4 484.7L342.8 320L507.4 155.3z"/>
              </svg>
            </button>
            <button type="button"
                    class="ml-3 relative z-30 cursor-pointer transition-colors duration-300"
                    title="Salva"
                    (click)="doSave()">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                   class="h-6 w-auto fill-current text-light-accent-secondary hover:text-light-accent-secondary/75 dark:text-dark-accent-secondary dark:hover:text-dark-accent-secondary/75">
                <path d="M550.5 140.5L541.1 153.4L261.1 537.4L250.1 552.5L236.9 539.3L100.9 403.3L89.6 392L112.2 369.4L123.5 380.7L246.3 503.5L515.3 134.6L524.7 121.7L550.6 140.6z"/>
              </svg>
            </button>
          }
        }
      </div>
    }

      @case ('name') {
        <div class="flex items-center gap-6">
          <h2 id="molecule-name"
              #value
              class="py-2 outline-none text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-wider text-center sm:text-left text-light-accent-primary dark:text-dark-accent-primary"
              [attr.contenteditable]="mode() === 'edit' ? 'true' : null"
              [ngClass]="{
                'px-2 bg-slate-100 dark:bg-slate-700 border border-light-on-surface-main dark:border-dark-on-surface-main rounded-md':
                mode() === 'edit'
              }">
            {{ _value() }}
          </h2>
            @if (_badgeName()) {
              <app-molecule-badge [name]="_badgeName()" class="block relative top-1" />
            }
            @if (mode() === 'view') {
              <button class="cursor-pointer transition-colors duration-300" title="Modifica" (click)="doEdit()">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                     class="h-7 w-auto fill-current text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75">
                  <path d="M58.1 555.9L48 592C50.7 591.2 117.4 572.6 248 536L569.4 214.6L592 192C589.6 189.6 549.1 149.1 470.6 70.6L448 48L425.4 70.6L104 392L58.1 555.9zM252.7 486L154 387.3L347.4 193.9L446.1 292.6L252.7 486zM229.4 508L94.2 545.8L132 410.6L229.4 508zM546.7 192L468.6 270.1L369.9 171.4L448 93.3L546.7 192z"/>
                </svg>
              </button>
            } @else {
              <div class="flex justify-center gap-2">
                <button class="cursor-pointer transition-colors duration-300" title="Annulla" (click)="doCancel()">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                       class="h-7 w-auto fill-current text-light-error hover:text-light-error/75 dark:text-dark-error dark:hover:text-dark-error/75">
                    <path d="M507.4 155.3L518.8 144L496.1 121.4L484.8 132.7L320.1 297.4L155.4 132.7L144.1 121.4L121.5 144L132.8 155.3L297.5 320L132.8 484.7L121.5 496L144.1 518.6L155.4 507.3L320.1 342.6L484.8 507.3L496.1 518.6L518.8 496L507.4 484.7L342.8 320L507.4 155.3z"/>
                  </svg>
                </button>
                <button class="cursor-pointer transition-colors duration-300" title="Salva" (click)="doSave()">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                       class="h-7 w-auto fill-current text-light-accent-secondary hover:text-light-accent-secondary/75 dark:text-dark-accent-secondary dark:hover:text-dark-accent-secondary/75">
                    <path d="M550.5 140.5L541.1 153.4L261.1 537.4L250.1 552.5L236.9 539.3L100.9 403.3L89.6 392L112.2 369.4L123.5 380.7L246.3 503.5L515.3 134.6L524.7 121.7L550.6 140.6z"/>
                  </svg>
                </button>
              </div>
            }
        </div>
      }

      @default {
        <!-- label / notes -->
        <div class="flex text-center sm:text-left gap-3 items-center"
             [class.mb-4]="_type() !== 'name'"
             [class.mb-3]="mode() === 'view' && _type() === 'name'">
          @if (_type() !== 'name') {
            <h2 [innerHTML]="_label()" class="font-semibold text-light-accent-primary dark:text-dark-accent-primary text-xl"></h2>
            <p
              #value
              class="p-2 outline-none"
              [attr.contenteditable]="mode() === 'edit' ? 'true' : null"
              [ngClass]="{
                'bg-slate-200 dark:bg-slate-700 border border-light-on-surface-main dark:border-dark-on-surface-main rounded-md': mode() === 'edit'
              }"
              [innerHTML]="_value()">
            </p>

            @if (mode() === 'view') {
              <button type="button"
                  class="ml-5 cursor-pointer transition-colors duration-300"
                  title="Modifica"
                  (click)="onEdit($event)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                     class="h-6 w-auto fill-current text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75">
                  <path d="M58.1 555.9L48 592C50.7 591.2 117.4 572.6 248 536L569.4 214.6L592 192C589.6 189.6 549.1 149.1 470.6 70.6L448 48L425.4 70.6L104 392L58.1 555.9zM252.7 486L154 387.3L347.4 193.9L446.1 292.6L252.7 486zM229.4 508L94.2 545.8L132 410.6L229.4 508zM546.7 192L468.6 270.1L369.9 171.4L448 93.3L546.7 192z"/>
                </svg>
              </button>
            } @else {
              <button type="button"
                  class="ml-5 cursor-pointer transition-colors duration-300"
                  title="Annulla"
                  (click)="onCancel($event)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                     class="h-6 w-auto fill-current text-light-error hover:text-light-error/75 dark:text-dark-error dark:hover:text-dark-error/75">
                  <path d="M507.4 155.3L518.8 144L496.1 121.4L484.8 132.7L320.1 297.4L155.4 132.7L144.1 121.4L121.5 144L132.8 155.3L297.5 320L132.8 484.7L121.5 496L144.1 518.6L155.4 507.3L320.1 342.6L484.8 507.3L496.1 518.6L518.8 496L507.4 484.7L342.8 320L507.4 155.3z"/>
                </svg>
              </button>
              <button type="button"
                  class="ml-5 cursor-pointer"
                  title="Salva"
                  (click)="onSave($event)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
                     class="h-6 w-auto fill-current text-light-accent-secondary hover:text-light-accent-secondary/75 dark:text-dark-accent-secondary dark:hover:text-dark-accent-secondary/75">
                  <path d="M550.5 140.5L541.1 153.4L261.1 537.4L250.1 552.5L236.9 539.3L100.9 403.3L89.6 392L112.2 369.4L123.5 380.7L246.3 503.5L515.3 134.6L524.7 121.7L550.6 140.6z"/>
                </svg>
              </button>
            }
          }
        </div>
      }
    }
  `
})
export class CustomDetailsComponent {

  // ======================= DEPS =======================
  private readonly r = inject(Renderer2);
  // ====================================================

  _label = signal<string>('');
  _value = signal<string>('');
  _badgeName = signal<string>('Personal Molecule');
  startValue = signal<string>('');
  _type = signal<'label' | 'notes' | 'name' | 'cardName'>('label');
  _itemId = signal<string>('')
  mode = signal<'view' | 'edit'>('view');
  _isReadonly = signal<Boolean>(false)
  lastValue = signal<string | null>(null)
  _triggerRollback = signal<boolean>(false)

  @ViewChild('value') valueRef!: ElementRef<HTMLElement>;

  @Input({ required: true })
  set type(type: 'label' | 'notes' | 'name' | 'cardName') {
    this._type.set(type);
    this._label.set(type === 'label' ? 'Etichetta:' : type === 'notes' ? 'Note:' : '');
  }

  @Input({ required: true })
  set value(value: string) {
    this._value.set(value);
    this.startValue.set(value);
  }

  @Input({ required: true })
  set itemId(itemId: string) {
    this._itemId.set(itemId)
  }

  @Input()
  set badgeName(badgeName: string) { this._badgeName.set(badgeName); }

  @Input()
  set isReadonly(isReadonly: boolean) {
    this._isReadonly.set(isReadonly)
  }

  @Input()
  set triggerRollback(triggerRollback: boolean) {
    this._triggerRollback.set(triggerRollback)
  }

  @Output()
  onSaving = new EventEmitter<CustomDetailSaveModel>()

  @Output()
  onDoingRollback = new EventEmitter<void>()

  constructor() {
    effect(() => {
      if (this._triggerRollback() && this.lastValue()) {
        queueMicrotask(() => {
          this._triggerRollback.set(false)
          // restore model and DOM to the last valid value
          const restore = this.lastValue()!
          this._value.set(restore)
          this.startValue.set(restore)
          const el = this.valueRef.nativeElement
          el.textContent = restore
          this.mode.set('view')
          this.onDoingRollback.emit()
        })
      }
    })
  }

  /* -------- actions -------- */
  doEdit() {
    this.mode.set('edit');
    const el = this.valueRef.nativeElement;
    this.r.setAttribute(el, 'contenteditable', 'true');
    this.r.setAttribute(el, 'tabindex', '0');
    // per edit coerente rispetto al value corrente
    el.textContent = this._value();

    requestAnimationFrame(() => {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }

  doCancel(): void {
    const el = this.valueRef.nativeElement;
    el.textContent = this.startValue();   // ripristina DOM
    this._value.set(this.lastValue() ?? this.startValue());   // riallinea modello
    this.mode.set('view');
    this.r.removeAttribute(el, 'contenteditable');
    this.r.removeAttribute(el, 'tabindex');
  }

  doSave(): void {
    const el = this.valueRef.nativeElement;
    const newValue = el.innerText;
    this.startValue.set(newValue);
    this.lastValue.set(this._value())
    this._value.set(newValue);
    this.mode.set('view');
    this.r.removeAttribute(el, 'contenteditable');
    this.r.removeAttribute(el, 'tabindex');

    this.onSaving.emit({
      label: this._label(),
      value: newValue,
      type: this._type() as 'label' | 'notes' | 'name' | 'cardName',
      id: this._itemId()
    });
  }

  onEdit(ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.doEdit();
  }

  onCancel(ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.doCancel();
  }

  onSave(ev: MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.doSave();
  }
}
