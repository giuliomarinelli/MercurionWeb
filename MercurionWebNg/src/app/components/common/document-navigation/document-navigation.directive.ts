import {
  AfterViewInit, Directive, ElementRef, computed, effect, inject, input, signal, untracked,
} from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { ScrollContextService } from '../../../services/context/scroll-context.service'
import { ShellLayoutService } from '../../../services/context/shell-layout.service'
import { injectBrowserResourceOwner } from '../../../utils/browser-resource-owner.util'

interface DocumentSection {
  readonly id: string
  readonly title: string
}

/** Owns fragment scrolling and focus for the two long policy documents. */
@Directive({ selector: '[mDocumentNavigation]', exportAs: 'mDocumentNavigation' })
export class DocumentNavigationDirective implements AfterViewInit {
  readonly prefix = input('document', { alias: 'mDocumentNavigation' })
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)
  private readonly route = inject(ActivatedRoute)
  private readonly scroll = inject(ScrollContextService)
  private readonly shell = inject(ShellLayoutService)
  private readonly resources = injectBrowserResourceOwner()
  private readonly fragment = toSignal(this.route.fragment, { initialValue: this.route.snapshot.fragment })
  private readonly ready = signal(false)
  private readonly outline = signal<readonly DocumentSection[]>([])
  private generation = 0
  readonly sections = computed(() => this.outline())

  constructor() {
    effect(() => {
      const ready = this.ready()
      const fragment = this.fragment()
      const root = this.scroll.scrollRootRef()
      const generation = ++this.generation
      if (!ready || !root || !fragment) return
      untracked(() => this.navigate(fragment, root, generation))
    })
  }

  ngAfterViewInit(): void {
    const headings = [...this.host.nativeElement.querySelectorAll<HTMLElement>('h1, h2')]
    this.outline.set(headings.map((heading, index) => {
      const parent = heading.parentElement
      const target = parent?.tagName === 'HEADER' && parent.id ? parent : heading
      if (!target.id) target.id = `${this.prefix()}-section-${index + 1}`
      target.tabIndex = -1
      return { id: target.id, title: heading.textContent?.trim() ?? '' }
    }))
    this.ready.set(true)
  }

  private navigate(fragment: string, root: ElementRef<HTMLElement>, generation: number): void {
    this.resources.waitForCondition(
      () => this.shell.headerHeight() > 0 ? this.shell.headerHeight() : null,
      headerHeight => this.resources.requestAnimationFrame(() => {
        this.resources.setTimeout(() => {
          if (generation !== this.generation) return
          const host = this.host.nativeElement
          const target = [...host.querySelectorAll<HTMLElement>('[id]')].find(item => item.id === fragment)
            ?? host.querySelector<HTMLElement>('h1')
          if (!target) return
          target.focus({ preventScroll: true })
          const y = Math.max(0, this.scroll.getScrollYRelativeToRoot(target, root.nativeElement) - headerHeight - 16)
          this.scroll.smoothTo(root, y, 240)
        }, 20)
      }),
    )
  }
}
