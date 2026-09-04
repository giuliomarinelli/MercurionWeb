import { Component, ChangeDetectionStrategy, Input, HostListener, ElementRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PublicPipe } from '../../../pipes/public.pipe';
import {
  OverlayModule,
  ConnectedPosition,
  ScrollStrategy,
  ScrollStrategyOptions
} from '@angular/cdk/overlay';
import { PmOption } from '../../../Models/pm-option.model';
import { NgClass } from '@angular/common';

@Component({
  selector: 'm-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PublicPipe,
    OverlayModule,
    NgClass
  ],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: PmSelectComponent,
    multi: true
  }],
  host: { '[attr.id]': 'id' },
  styles: [`
    .emoji-font {
      font-family: 'Noto Color Emoji','Twemoji Country Flags','Segoe UI Emoji','Apple Color Emoji',system-ui,sans-serif !important;
    }
  `],
  template: `
    <div [class]="containerClass">
      <div class="w-full relative" cdkOverlayOrigin #origin="cdkOverlayOrigin">
        @if (label) {
          <label [attr.for]="id + '-btn'"
            class="block ml-[2px] mb-2 text-base"
            [ngClass]="[textClass, darkTextClass]">
            {{ label }}
          </label>
        }

        <button
          [id]="id + '-btn'"
          type="button"
          [attr.aria-haspopup]="'listbox'"
          [attr.aria-expanded]="opened"
          [disabled]="disabled"
          (click)="toggle()"
          (keydown)="onKey($event)"
          [attr.aria-controls]="opened ? id + '-listbox' : null"
          [attr.aria-label]="label || placeholder"
          [attr.aria-disabled]="disabled"
          class="relative w-full appearance-none text-lg text-slate-600 outline outline-1 -outline-offset-1
                 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2
                 focus-visible:outline-light-accent-primary dark:bg-transparent dark:text-slate-400
                 focus:border-light-accent-primary
                 hover:bg-slate-200/60 dark:hover:bg-neutral-800/50
                 block px-4 py-3 border-[2px] border-slate-300 dark:border-slate-200 rounded-md transition duration-300
                 focus:outline-none focus:ring-2 focus:ring-light-accent-primary cursor-pointer
                 text-left pr-10"
          [ngClass]="darkFocusClassList">

          <span class="emoji-font inline-flex items-center gap-2">
            @if (currentIconUrl) {
              <img [src]="currentIconUrl! | public"
                   [alt]="currentIconAlt || ''"
                   class="w-6 h-6 inline-block rounded-[3px] object-cover mr-3"/>
            }
            <span class="leading-tight">{{ currentLabel || placeholder }}</span>
          </span>

          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"
               class="fill-current pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5
                      text-slate-600 dark:text-slate-200">
            <path d="M536 224L320 456L104 224L536 224z"/>
          </svg>
        </button>

        <ng-template
          cdkConnectedOverlay
          [cdkConnectedOverlayOrigin]="origin"
          [cdkConnectedOverlayOpen]="opened"
          [cdkConnectedOverlayHasBackdrop]="true"
          (backdropClick)="opened=false"
          [cdkConnectedOverlayBackdropClass]="'transparent'"
          [cdkConnectedOverlayScrollStrategy]="scrollStrategy"
          [cdkConnectedOverlayPositions]="positions">

          <ul role="listbox"
              class="z-[200] mt-2 w-full rounded-md border border-slate-400 dark:border-slate-200
                     bg-slate-100 dark:bg-neutral-800 shadow-lg overflow-auto m-scroll-thin"
              [style.maxHeight.px]="maxHeight"
              [attr.id]="id + '-listbox'">

            @for (o of options; track o.value; let i = $index) {
              <li role="option"
                  [attr.aria-selected]="o.value === value"
                  (click)="choose(i)"
                  class="px-4 py-3 cursor-pointer text-lg dark:text-slate-200
                         hover:bg-slate-300/45 dark:hover:bg-slate-700/40 transition"
                  [class.bg-slate-300/35]="i === highlighted"
                  [class.dark:bg-slate-700/80]="i === highlighted">

                <span class="emoji-font inline-flex items-center gap-2">
                  @if (o.iconUrl) {
                    <img [src]="o.iconUrl! | public"
                         [alt]="o.iconAlt || ''"
                         class="w-5 h-5 inline-block rounded-[3px] object-cover mr-3"
                         loading="lazy" />
                  }
                  <span>{{ o.label }}</span>
                </span>
              </li>
            }
          </ul>
        </ng-template>
      </div>
    </div>
  `
})
export class PmSelectComponent implements ControlValueAccessor {

  @Input() id = 'm-select';
  @Input() label = '';
  @Input() placeholder = 'Seleziona…';
  @Input() options: PmOption[] = [];
  @Input() disabled = false;
  @Input() containerClass = 'flex justify-center mx-auto max-w-[500px]';
  @Input() maxHeight = 250;
  @Input() textClass = 'text-light-accent-secondary'
  @Input() darkTextClass = 'dark:text-dark-accent-secondary/90'
  @Input() darkFocusClassList = [
    'dark:focus:ring-dark-accent-primary-btn-hc',
    'dark:focus:border-dark-accent-primary-btn-hc',
    'dark:focus-visible:outline-dark-accent-primary-btn-hc',
    'dark:focus-visible:outline-dark-accent-primary-btn-hc'
  ]

  opened = false;
  value: any = null;
  highlighted = -1;

  // ✅ tipizzato, così originX ecc non diventano "string"
  positions: ConnectedPosition[] = [
    {
      originX: 'start', originY: 'bottom',
      overlayX: 'start', overlayY: 'top',
      offsetY: 8
    },
    {
      originX: 'start', originY: 'top',
      overlayX: 'start', overlayY: 'bottom',
      offsetY: -8
    }
  ];

  // ✅ scroll strategy vera
  private sso = inject(ScrollStrategyOptions);
  scrollStrategy: ScrollStrategy = this.sso.reposition();

  private onChange = (_: any) => { };
  private onTouched = () => { };

  constructor(private el: ElementRef<HTMLElement>) { }

  private get currentOption() {
    return this.options.find(o => o.value === this.value);
  }

  get currentLabel() { return this.currentOption?.label ?? ''; }
  get currentIconUrl() { return this.currentOption?.iconUrl; }
  get currentIconAlt() { return this.currentOption?.iconAlt; }

  writeValue(v: any) { this.value = v; }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }

  toggle() {
    if (this.disabled) return;
    this.opened = !this.opened;
    if (this.opened) {
      const idx = this.options.findIndex(o => o.value === this.value);
      this.highlighted = idx >= 0 ? idx : 0;
    }
  }

  choose(i: number) {
    const opt = this.options[i];
    if (!opt) return;
    this.value = opt.value;
    this.onChange(this.value);
    this.opened = false;
    this.onTouched();
  }

  onKey(e: KeyboardEvent) {
    if (!this.opened && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault(); this.toggle(); return;
    }
    if (!this.opened) return;

    if (e.key === 'ArrowDown') { e.preventDefault(); this.highlighted = Math.min(this.options.length - 1, this.highlighted + 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); this.highlighted = Math.max(0, this.highlighted - 1); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.choose(this.highlighted); }
    if (e.key === 'Escape') { e.preventDefault(); this.opened = false; }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const target = ev.target as Node;
    if (!this.el.nativeElement.contains(target)) this.opened = false;
  }
}
