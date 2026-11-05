import { TestBed } from '@angular/core/testing'
import { PrivacyPageComponent } from './privacy.page.component'

describe('PrivacyPageComponent document navigation', () => {
  it('exposes a complete outline without changing the policy version or contact details', async () => {
    TestBed.configureTestingModule({ imports: [PrivacyPageComponent] })
    const fixture = TestBed.createComponent(PrivacyPageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
    const host = fixture.nativeElement as HTMLElement
    const links = [...host.querySelectorAll<HTMLAnchorElement>('nav a')]
    expect(links.length).toBe(10)
    expect(links.every(link => [...host.querySelectorAll('[id]')].some(target => '#' + target.id === link.hash))).toBeTrue()
    expect(host.textContent).toContain('27/10/2026')
    expect(host.textContent).toContain('mercurion.app@gmail.com')
    expect(host.textContent).toContain('giuliomarinelli25@pec.it')
  })
})
