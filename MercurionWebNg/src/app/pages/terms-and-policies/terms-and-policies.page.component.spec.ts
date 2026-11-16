import { TestBed } from '@angular/core/testing'
import { TermsAndPoliciesPageComponent } from './terms-and-policies.page.component'

describe('TermsAndPoliciesPageComponent document navigation', () => {
  it('keeps the existing terms/AUP deep links and exposes valid outline destinations', async () => {
    TestBed.configureTestingModule({ imports: [TermsAndPoliciesPageComponent] })
    const fixture = TestBed.createComponent(TermsAndPoliciesPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    const host = fixture.nativeElement as HTMLElement
    expect(host.querySelector('#terms')).not.toBeNull()
    expect(host.querySelector('#aup')).not.toBeNull()
    const links = [...host.querySelectorAll<HTMLAnchorElement>('nav a')]
    expect(links.length).toBeGreaterThan(20)
    expect(links.every(link => [...host.querySelectorAll('[id]')].some(target => '#' + target.id === link.hash))).toBeTrue()
    expect(host.textContent).toContain('27/10/2026')
  })
})
