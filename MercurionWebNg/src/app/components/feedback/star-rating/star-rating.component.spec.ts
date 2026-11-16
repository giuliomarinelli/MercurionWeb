import { TestBed } from '@angular/core/testing'
import { StarRatingComponent } from './star-rating.component'

describe('StarRatingComponent keyboard and semantics', () => {
  it('represents an optional rating as five named radios with a single tab stop', () => {
    TestBed.configureTestingModule({ imports: [StarRatingComponent] })
    const fixture = TestBed.createComponent(StarRatingComponent)
    fixture.componentRef.setInput('label', 'Utilità')
    fixture.detectChanges()
    const radios = [...fixture.nativeElement.querySelectorAll('[role="radio"]')] as HTMLButtonElement[]
    expect(radios.length).toBe(5)
    expect(radios.filter(item => item.tabIndex === 0).length).toBe(1)
    expect(radios.every(item => item.getAttribute('aria-checked') === 'false')).toBeTrue()
    radios[0].focus()
    radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    fixture.detectChanges()
    expect(fixture.componentInstance.value()).toBe(1)
    radios[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    fixture.detectChanges()
    expect(fixture.componentInstance.value()).toBe(5)
    expect(document.activeElement).toBe(radios[4])
    radios[4].dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    fixture.detectChanges()
    expect(fixture.componentInstance.value()).toBeNull()
    expect(document.activeElement).toBe(radios[0])
  })

  it('blocks pointer and keyboard updates when disabled', () => {
    TestBed.configureTestingModule({ imports: [StarRatingComponent] })
    const fixture = TestBed.createComponent(StarRatingComponent)
    fixture.componentRef.setInput('disabled', true)
    fixture.detectChanges()
    fixture.componentInstance.set(3)
    const first = fixture.nativeElement.querySelector('[role="radio"]') as HTMLButtonElement
    first.click()
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    expect(fixture.componentInstance.value()).toBeNull()
    expect(first.disabled).toBeTrue()
  })
})
