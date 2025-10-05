import { Directive, ElementRef, Input, OnChanges, SimpleChanges, Renderer2, AfterViewInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appCollapseMaxH]',
  standalone: true,
})
export class CollapseMaxHeightDirective implements OnChanges, AfterViewInit, OnDestroy {
  /** true = espanso, false = collassato */
  @Input('appCollapseMaxH') expanded = false;
  /** altezza chiusa */
  @Input() minPx = 181;
  /** altezza aperta (usata se auto=false) */
  @Input() maxPx = 272;
  /** se true usa l’altezza reale del contenuto (scrollHeight) */
  @Input() auto = false;
  /** durata ms */
  @Input() duration = 300;
  /** easing CSS */
  @Input() easing = 'ease-in-out';

  private el: HTMLElement;
  private ro?: ResizeObserver;
  private onEnd?: () => void;

  constructor(ref: ElementRef<HTMLElement>, private r: Renderer2) {
    this.el = ref.nativeElement;
  }

  ngAfterViewInit() {
    // stato iniziale senza transizioni
    this.r.setStyle(this.el, 'overflow', 'hidden');          // evita jump
    this.r.setStyle(this.el, 'willChange', 'max-height');
    this.r.setStyle(this.el, 'transition', 'none');

    if (this.expanded) {
      if (this.auto) {
        // setto alla misura reale e poi libero a none (senza animare)
        const h = this.el.scrollHeight;
        this.r.setStyle(this.el, 'maxHeight', `${h}px`);
        // libero a none dopo un tick per non sporcare layout
        requestAnimationFrame(() => this.r.setStyle(this.el, 'maxHeight', 'none'));
      } else {
        this.r.setStyle(this.el, 'maxHeight', `${this.maxPx}px`);
      }
    } else {
      this.r.setStyle(this.el, 'maxHeight', `${this.minPx}px`);
    }

    // opzionale: se auto=true, aggiorna maxHeight quando il contenuto cambia mentre è aperto
    if (this.auto) {
      this.ro = new ResizeObserver(() => {
        if (this.expanded) {
          // se in stato aperto “auto”, tenerlo a none è ok: niente animazione
          // se preferisci animare anche le crescite spontanee, commenta la riga sotto e usa animateTo(scrollHeight)
          this.r.setStyle(this.el, 'maxHeight', 'none');
        }
      });
      this.ro.observe(this.el);
    }
  }

  ngOnChanges(ch: SimpleChanges) {
    if (!this.el) return;
    if (!('expanded' in ch)) return;

    // Altezza attuale (from)
    const from = this.el.getBoundingClientRect().height;

    // Target (to)
    const to = this.expanded
      ? (this.auto ? this.el.scrollHeight : this.maxPx)
      : this.minPx;

    // Se sei già alla misura richiesta, non forzare animazioni inutili
    if (!this.auto && Math.round(from) === Math.round(to)) return;

    // 1) blocco lo start a px (nessuna transizione)
    this.r.setStyle(this.el, 'transition', 'none');
    // se eravamo in none (stato auto), serve prima rimettere un px reale per avere un from valido
    this.r.setStyle(this.el, 'maxHeight', `${from}px`);

    // 2) doppio rAF: abilito la transition e poi vado al target
    requestAnimationFrame(() => {
      // forza reflow
      void this.el.offsetHeight;
      this.r.setStyle(this.el, 'transition', `max-height ${this.duration}ms ${this.easing}`);
      this.r.setStyle(this.el, 'maxHeight', `${to}px`);

      // cleanup/sincronizzazione a fine animazione
      this.detachEnd();
      this.onEnd = this.r.listen(this.el, 'transitionend', (e: TransitionEvent) => {
        if (e.propertyName !== 'max-height') return;
        // in apertura auto: libera a none per adattarsi a crescite
        if (this.auto && this.expanded) {
          this.r.setStyle(this.el, 'transition', 'none');
          this.r.setStyle(this.el, 'maxHeight', 'none');
          // ripristina transition per i toggle successivi
          requestAnimationFrame(() =>
            this.r.setStyle(this.el, 'transition', `max-height ${this.duration}ms ${this.easing}`)
          );
        }
        this.detachEnd();
      });
    });
  }

  private detachEnd() {
    if (this.onEnd) {
      this.onEnd();
      this.onEnd = undefined;
    }
  }

  ngOnDestroy() {
    this.detachEnd();
    this.ro?.disconnect();
  }
}
