import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-create-collection',
  imports: [ReactiveFormsModule],
  template: `

  <div class="flex justify-center items-center min-h-screen px-2">
    <div class="w-full max-w-5xl bg-white dark:bg-dark-surface-main rounded-xl shadow-lg">
      <div class="flex items-center justify-between px-4 py-4 border-b border-b-slate-400 sticky top-0 z-50 rounded-t-xl bg-white dark:bg-dark-surface-main">
        <h2 class="text-lg font-semibold">Crea una o più collezioni molecolari</h2>
        <button class="text-2xl hover:text-emerald-600" (click)="close()">&times;</button>
      </div>
      <!-- <div class="mx-auto">
        <div class="mt-6 space-y-6 sm:flex sm:items-center sm:space-x-10 sm:space-y-0 px-6 pb-6 border-b border-spacing-y-[0.3px]">
        </div>
      </div> -->
      <div class="border-b min-h-48 relative">
        <div class="absolute inset-0 flex justify-center items-center text-sm text-gray-500 dark:text-gray-400">
          Qui vedrai l'anteprima dei nomi delle nuove collezioni.
        </div>
      </div>
      <div class="py-6 px-3 overflow-y-auto flex flex-col gap-4 min-h-[25vh] max-h-[45vh]">
        <label for="nameInput" class="ml-px text-sm font-semibold block">Nome nuova collezione</label>
        <div class="grid grid-cols-12 gap-4">
          <div class="col-span-9 flex gap-2 items-center relative">
            <input
              id="nameInput"
              #nameInput
              [formControl]="nameControl"
              type="text"
              placeholder="Inserisci una nuova collezione..."
              class="flex-1 px-4 py-2 rounded-lg bg-white/90 text-black placeholder:text-gray-500 shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 transition w-full"
              [class.pr-10]="name().trim()"
              [class.pl-4]="name().trim()"
              [class.px-4]="!name().trim()"
            />
            @if (name().trim()) {
              <button type="button"
                      (click)="clear()"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-500 transition"
                      tabindex="-1"
                      aria-label="Cancella ricerca">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 20 20">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l8 8m0-8l-8 8"/>
                </svg>
              </button>
            }
          </div>
          <button
            type="submit"
            class="col-span-3 px-4 py-2 rounded bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed transition-colors"
            [disabled]="false"

          >Aggiungi</button>
        </div>
      </div>
      <div class="my-4 mr-8 flex justify-end gap-2">

          <button
            type="button"
            class="px-4 py-2 rounded bg-slate-200 text-light-on-surface-main dark:bg-slate-100 dark:text-neutral-950 hover:bg-gray-300"
            (click)="close()"
          >
            Annulla
          </button>

        <button
          type="submit"
          class="px-4 py-2 rounded bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed"
          [disabled]="false"

        >
          <span>Crea</span>

        </button>
      </div>
    </div>

  </div>

  `
})
export class CreateCollectionComponent implements OnInit, AfterViewInit, OnDestroy {

  private readonly overlayContext = inject(ActionOverlayContextService)


  private naSub?: Subscription


  @ViewChild('nameInput')
  private nameInputRef!: ElementRef<HTMLInputElement>

  nameControl = new FormControl('', { nonNullable: true })
  name = signal<string>('')

  ngOnInit(): void {
    this.naSub = this.nameControl.valueChanges.subscribe(val => this.name.set(val))
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.nameInputRef.nativeElement.focus())
  }

  ngOnDestroy(): void {
    this.naSub?.unsubscribe()
  }

  clear(): void {
    queueMicrotask(() => this.nameInputRef.nativeElement.focus());
  }

  close(): void {
    this.overlayContext.close()
  }



}
