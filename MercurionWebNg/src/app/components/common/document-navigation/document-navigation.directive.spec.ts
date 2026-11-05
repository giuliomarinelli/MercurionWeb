import { Component, ElementRef } from '@angular/core'
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { BehaviorSubject } from 'rxjs'
import { DocumentNavigationDirective } from './document-navigation.directive'
import { ScrollContextService } from '../../../services/context/scroll-context.service'
import { ShellLayoutService } from '../../../services/context/shell-layout.service'

@Component({
  imports: [DocumentNavigationDirective],
  template: '<section mDocumentNavigation="qa"><header id="terms"><h1>Documento</h1></header><h2 id="topic">Argomento</h2></section>',
})
class DocumentHost {}

describe('DocumentNavigationDirective fragment ownership', () => {
  let fixture: ComponentFixture<DocumentHost>
  let fragment: BehaviorSubject<string | null>
  let scroll: ScrollContextService
  let shell: ShellLayoutService

  beforeEach(() => {
    fragment = new BehaviorSubject<string | null>('topic')
    TestBed.configureTestingModule({ imports: [DocumentHost], providers: [
      { provide: ActivatedRoute, useValue: { fragment, snapshot: { fragment: 'topic' } } },
    ] })
    fixture = TestBed.createComponent(DocumentHost)
    scroll = TestBed.inject(ScrollContextService)
    shell = TestBed.inject(ShellLayoutService)
    scroll.registerScrollRootRef(new ElementRef(document.documentElement))
    spyOn(scroll, 'getScrollYRelativeToRoot').and.returnValue(200)
  })

  it('waits for the header, subtracts its height and focuses the fragment', fakeAsync(() => {
    shell.setHeaderHeight(0)
    const smooth = spyOn(scroll, 'smoothTo')
    fixture.detectChanges()
    tick(16)
    expect(smooth).not.toHaveBeenCalled()
    shell.setHeaderHeight(48)
    tick(100)
    expect(smooth.calls.count()).toBe(1)
    expect(smooth.calls.mostRecent().args[1]).toBe(136)
    expect(document.activeElement?.id).toBe('topic')
  }))

  it('ignores a queued old fragment when the destination changes', fakeAsync(() => {
    shell.setHeaderHeight(48)
    const smooth = spyOn(scroll, 'smoothTo')
    fixture.detectChanges()
    fragment.next('terms')
    fixture.detectChanges()
    tick(100)
    expect(smooth.calls.count()).toBe(1)
    expect(document.activeElement?.id).toBe('terms')
  }))

  it('cancels pending frames and timers when the page is destroyed', fakeAsync(() => {
    shell.setHeaderHeight(0)
    const smooth = spyOn(scroll, 'smoothTo')
    fixture.detectChanges()
    fixture.destroy()
    shell.setHeaderHeight(48)
    tick(200)
    expect(smooth).not.toHaveBeenCalled()
  }))

  it('cancels a queued fragment scroll when browser navigation clears the fragment', fakeAsync(() => {
    shell.setHeaderHeight(48)
    const smooth = spyOn(scroll, 'smoothTo')
    fixture.detectChanges()
    fragment.next(null)
    fixture.detectChanges()
    tick(100)
    expect(smooth).not.toHaveBeenCalled()
  }))
})
