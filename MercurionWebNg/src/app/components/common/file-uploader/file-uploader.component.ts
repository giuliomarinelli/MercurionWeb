import {
  Component,
  ChangeDetectionStrategy,
  EventEmitter,
  Output,
  Input,
  ViewChild,
  ElementRef,
  signal,
  computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClassicSpinnerComponent } from '../classic-spinner/classic-spinner.component';


type FileKind = 'all' | 'images' | 'pdf';

@Component({
  selector: 'm-file-uploader',
  imports: [CommonModule, ClassicSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative"
      [class.opacity-60]="disabled"
      role="group"
      [attr.aria-labelledby]="labelId"
      [attr.aria-describedby]="hint ? hintId : null"
      [attr.aria-busy]="loading"
    >
      <!-- Label + hint -->
      <div class="mb-2">
        <label [attr.for]="inputId"
               class="block text-sm font-medium text-slate-200"
               [attr.id]="labelId">{{ label }}</label>
        @if (hint) {
          <p class="text-xs text-slate-400 mt-0.5" [attr.id]="hintId">{{ hint }}</p>
        }
      </div>

      <!-- Dropzone -->
      <div
        tabindex="0"
        (keydown.enter)="triggerBrowse()"
        (keydown.space)="triggerBrowse(); $event.preventDefault()"
        (click)="triggerBrowse()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (paste)="onPaste($event)"
        class="group relative flex flex-col items-center justify-center gap-3 px-5 py-8
               rounded-2xl border border-dashed transition
               bg-slate-900/40
               shadow-[0_8px_24px_-10px_rgba(0,0,0,.6)]
               ring-1 ring-slate-700/60
               hover:ring-2 hover:ring-offset-0 hover:ring-transparent
               cursor-pointer select-none outline-none
               focus-visible:ring-2 focus-visible:ring-indigo-400/70
               "
        [class.ring-indigo-400]="isOver()"
        [class.border-indigo-400]="isOver()"
        [class.cursor-not-allowed]="disabled"
        [attr.aria-disabled]="disabled || loading"
        [attr.aria-busy]="loading"
        role="button"
        [attr.aria-label]="dropzoneLabel()"
      >
        <!-- Gradient halo (brandable) -->
        <div class="pointer-events-none absolute -inset-px rounded-2xl
                    bg-gradient-to-br from-indigo-500/25 via-fuchsia-500/20 to-sky-500/25
                    opacity-0 group-hover:opacity-100 transition"></div>

        <!-- Icona -->
        <div class="relative">
          <svg class="w-10 h-10" viewBox="0 0 24 24" aria-hidden="true">
            <path class="fill-slate-200/85"
              d="M12 3a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v7a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-7a2 2 0 0 0-2-2h-3V7a4 4 0 0 0-4-4Zm-2 6V7a2 2 0 1 1 4 0v2h-4Z"/>
          </svg>
        </div>

        <!-- Testi azione -->
        <div class="text-center">
          <p class="text-sm text-slate-200">
            <span class="font-medium underline decoration-dotted">Sfoglia</span>
            o <span class="font-medium">trascina qui</span>
            @if (mode === 'images') {
              — oppure <span class="font-medium">incolla</span>
            }
          </p>
          <p class="text-xs mt-1 text-slate-400">
            {{ acceptLabel() }}
            @if (maxSize) {
              · max {{ formatBytes(maxSize) }}
            }
          </p>
        </div>

        @if (previewUrl) {
          <!-- Preview (opzionale, controllata dal padre) -->
          <div class="mt-3">
            <img [src]="previewUrl!" alt="Anteprima file" class="max-h-40 rounded-xl ring-1 ring-slate-700/60" />
          </div>
        }
        @if (fileName) {
          <!-- Filename (opzionale) -->
          <div class="text-xs text-slate-300 mt-2 line-clamp-1">
            {{ fileName }}
          </div>
        }
        @if (error) {
          <!-- Errore -->
          <div *ngIf="error" class="mt-2 text-xs text-rose-400" role="alert" aria-live="assertive">{{ error }}</div>
        }
        @if (loading) {
          <!-- Spinner overlay -->
          <m-classic-spinner
            *ngIf="loading"
            [overlay]="true"
            [size]="56"
            ariaLabel="Caricamento in corso"
            class="text-indigo-400"
          />
        }
      </div>

      <!-- Input invisibile -->
      <input
        #fileInput
        type="file"
        class="sr-only"
        [attr.id]="inputId"
        [attr.accept]="acceptAttr() || null"
        [disabled]="disabled || loading"
        (change)="onBrowseChange($event)"
      />

      <!-- Action row controllata dal padre -->
      <div class="flex items-center gap-3 mt-3" *ngIf="fileName || previewUrl">
        <button type="button"
                (click)="triggerBrowse()"
                [disabled]="disabled || loading"
                [attr.aria-disabled]="disabled || loading"
                class="px-3 py-1.5 text-sm rounded-xl
                       bg-slate-800/70 hover:bg-slate-800
                       ring-1 ring-slate-700/60 text-slate-200 transition">
          Sostituisci
        </button>
        <button type="button"
                (click)="onClearClicked()"
                [disabled]="disabled || loading"
                [attr.aria-disabled]="disabled || loading"
                class="px-3 py-1.5 text-sm rounded-xl
                       bg-transparent hover:bg-slate-800/60
                       ring-1 ring-slate-700/60 text-slate-300 transition">
          Rimuovi
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .sr-only {
      position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
      clip:rect(0,0,0,0);white-space:nowrap;border:0;
    }
  `]
})
export class FileUploaderComponent {
  @Input({ required: false }) mode: FileKind = 'all';          // 'images' | 'pdf' | 'all'
  @Input({ required: false }) loading = false;                  // overlay spinner
  @Input({ required: false }) disabled = false;                 // disabilita interazioni
  @Input({ required: false }) label = 'Carica file';
  @Input({ required: false }) hint: string | null = null;
  @Input({ required: false }) error: string | null = null;      // messaggio gestito dal padre
  @Input({ required: false }) maxSize?: number;                 // es. 10*1024*1024
  @Input({ required: false }) previewUrl?: string | null = null;// preview (immagine) dal padre
  @Input({ required: false }) fileName?: string | null = null;  // nome file mostrato

  // Personalizzazione rapida di classi/tema (se vuoi sovrascrivere da fuori)
  @Input({ required: false }) inputId = 'fu-' + Math.random().toString(36).slice(2);

  @Output() fileSelected = new EventEmitter<File>();            // ogni volta che scegli/trascini/incolli
  @Output() cleared = new EventEmitter<void>();                 // click su rimuovi
  @Output() rejected = new EventEmitter<{ reason: string; file?: File }>();

  @ViewChild('fileInput', { static: true }) fileInput!: ElementRef<HTMLInputElement>;
  labelId = `fu-label-${Math.random().toString(36).slice(2)}`;
  hintId = `fu-hint-${Math.random().toString(36).slice(2)}`;

  // solo per evidenziare UI in dragover (non conserva il file: stateless)
  private _isOver = signal(false);
  isOver = this._isOver.asReadonly();

  acceptAttr = computed(() => {
    switch (this.mode) {
      case 'images': return 'image/*';
      case 'pdf':    return 'application/pdf';
      default:       return ''; // all
    }
  });

  acceptLabel = computed(() => {
    switch (this.mode) {
      case 'images': return 'Sono accettate solo immagini (PNG, JPG, WEBP, SVG…)';
      case 'pdf':    return 'È accettato solo un PDF';
      default:       return 'Sono accettati immagini, PDF o altri file';
    }
  });

  dropzoneLabel = computed(() => {
    const accept = this.acceptLabel();
    const size = this.maxSize ? `; dimensione massima ${this.formatBytes(this.maxSize)}` : '';
    return `${this.label}. ${accept}${size}`;
  });

  triggerBrowse() {
    if (this.disabled || this.loading) return;
    this.fileInput.nativeElement.click();
  }

  onBrowseChange(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.handleCandidate(file);
    // ripulisce l’input per poter riselezionare lo stesso file se serve
    input.value = '';
  }

  onClearClicked() {
    if (this.disabled || this.loading) return;
    this.cleared.emit();
  }

  onDragOver(e: DragEvent) {
    if (this.disabled || this.loading) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer!.dropEffect = 'copy';
    this._isOver.set(true);
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this._isOver.set(false);
  }

  onDrop(e: DragEvent) {
    if (this.disabled || this.loading) return;
    e.preventDefault();
    e.stopPropagation();
    this._isOver.set(false);

    const dt = e.dataTransfer;
    if (!dt || !dt.files?.length) return;
    const file = dt.files[0];
    this.handleCandidate(file);
  }

  onPaste(e: ClipboardEvent) {
    // Paste valido solo per immagini (richiesta)
    if (this.disabled || this.loading) return;
    if (this.mode !== 'images') return;

    const items = e.clipboardData?.items;
    if (!items || !items.length) return;

    for (const it of items) {
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const file = it.getAsFile();
        if (file) {
          e.preventDefault();
          this.handleCandidate(file);
          return;
        }
      }
    }
  }

  private handleCandidate(file: File) {
    if (!this.isAccepted(file)) {
      this.rejected.emit({ reason: 'type', file });
      return;
    }
    if (this.maxSize && file.size > this.maxSize) {
      this.rejected.emit({ reason: 'size', file });
      return;
    }
    this.fileSelected.emit(file);
  }

  private isAccepted(file: File): boolean {
    const accept = this.acceptAttr();
    if (!accept) return true; // all
    const parts = accept.split(',').map(s => s.trim()).filter(Boolean);
    const mime = file.type || '';
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();

    for (const p of parts) {
      if (p.endsWith('/*')) {
        const base = p.slice(0, -2);
        if (mime.startsWith(base + '/')) return true;
      } else if (p.startsWith('.')) {
        if (ext === p.toLowerCase()) return true;
      } else {
        if (mime === p) return true;
      }
    }
    return false;
  }

  formatBytes(bytes: number) {
    if (!bytes && bytes !== 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let v = bytes, i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
  }
}
