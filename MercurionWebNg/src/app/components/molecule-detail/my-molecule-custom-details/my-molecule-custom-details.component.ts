import { MyMoleculeCustomDetailSaveModel } from './../../../Models/my-molecule-custom-detail-save.interface';
import { NgClass } from '@angular/common';
import { Component, ElementRef, EventEmitter, inject, Input, Output, Renderer2, signal, ViewChild } from '@angular/core';

@Component({
  selector: 'app-my-molecule-custom-details',
  imports: [NgClass],
  template: `
    <div class="flex text-center sm:text-left gap-3 items-center mb-4" [class.mb-3="mode() === 'view'"]>
      <h2 [innerHTML]="_label()" class="font-semibold text-light-accent-primary dark:text-dark-accent-primary text-xl"></h2>

      <p #value
         class="p-2 outline-none"
         [attr.contenteditable]="mode() === 'edit' ? 'true' : null"
         [ngClass]="{ 'bg-slate-200 dark:bg-slate-400 border border-light-on-surface-main dark:border-dark-on-surface-main rounded-md': mode() === 'edit' }"
         [innerHTML]="_value()"
         >
      </p>

      @if (mode() === 'view') {
        <button class="ml-5 cursor-pointer transition-colors duration-300" title="Modifica" (click)="doEdit()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-6 w-auto text-slate-800 hover:text-slate-800/75 dark:text-slate-200 dark:hover:text-slate-200/75">
            <path d="M58.1 555.9L48 592C50.7 591.2 117.4 572.6 248 536L569.4 214.6L592 192C589.6 189.6 549.1 149.1 470.6 70.6L448 48L425.4 70.6L104 392L58.1 555.9zM252.7 486L154 387.3L347.4 193.9L446.1 292.6L252.7 486zM229.4 508L94.2 545.8L132 410.6L229.4 508zM546.7 192L468.6 270.1L369.9 171.4L448 93.3L546.7 192z"/>
          </svg>
        </button>
      } @else if (mode() === 'edit') {
        <button class="ml-5 cursor-pointer transition-colors duration-300" title="Annulla" (click)="doCancel()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-6 w-auto text-light-error hover:text-light-error/75 dark:text-dark-error dark:hover:text-dark-error/75">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path d="M507.4 155.3L518.8 144L496.1 121.4L484.8 132.7L320.1 297.4L155.4 132.7L144.1 121.4L121.5 144L132.8 155.3L297.5 320L132.8 484.7L121.5 496L144.1 518.6L155.4 507.3L320.1 342.6L484.8 507.3L496.1 518.6L518.8 496L507.4 484.7L342.8 320L507.4 155.3z"/>
          </svg>
        </button>
        <button class="ml-5 cursor-pointer" title="Salva" (click)="doSave()">
          <svg xmlns="http://www.w3.org/2000/svg" title="Salva" viewBox="0 0 640 640" class="fill-current h-6 w-auto text-light-accent-secondary hover:text-light-accent-secondary/75 dark:text-dark-accent-secondary dark:hover:text-dark-accent-secondary/75">
            <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
            <path d="M550.5 140.5L541.1 153.4L261.1 537.4L250.1 552.5L236.9 539.3L100.9 403.3L89.6 392L112.2 369.4L123.5 380.7L246.3 503.5L515.3 134.6L524.7 121.7L550.6 140.6z"/>
          </svg>
        </button>
      }
    </div>
  `
})
export class MyMoleculeCustomDetailsComponent {

  // ======================= DEPS =======================
  private readonly r = inject(Renderer2)
  // ====================================================


  _label = signal<string>('');
  _value = signal<string>('');
  startValue = signal<string>('')
  _type = signal<'label' | 'notes' | ''>('');
  mode = signal<'view' | 'edit'>('view');

  @ViewChild('value') valueRef!: ElementRef<HTMLParagraphElement>;

  @Input({ required: true })
  set type(type: 'label' | 'notes') {
    this._type.set(type);
    this._label.set(type === 'label' ? 'Etichetta:' : 'Note:');
  }

  @Input({ required: true })
  set value(value: string) {
    this._value.set(value);
    this.startValue.set(value)
  }

  @Output()
  onSave = new EventEmitter<MyMoleculeCustomDetailSaveModel>

  doEdit() {
    this.mode.set('edit');
    const el = this.valueRef.nativeElement;
    this.r.setAttribute(el, 'contenteditable', 'true');
    this.r.setAttribute(el, 'tabindex', '0');
    el.textContent = this._value();       // <- importante

    requestAnimationFrame(() => {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges(); sel?.addRange(range);
    });
  }


  doCancel(): void {
    const el = this.valueRef.nativeElement;
    el.textContent = this.startValue();   // ripristina il DOM
    this._value.set(this.startValue());   // riallinea il modello (inutile ma coerente)
    this.mode.set('view');
  }

  doSave(): void {
    this.mode.set('view')
    const newValue = this.valueRef.nativeElement.innerHTML
    this.startValue.set(newValue)
    this._value.set(newValue)
    this.onSave.emit({
      label: this._label(),
      value: newValue,
      type: this._type() as 'label' | 'notes'
    })
  }

}
