import { TestBed } from '@angular/core/testing'
import { signal } from '@angular/core'
import { ContactsPageComponent } from './contacts.page.component'
import { UserContextService } from '../../services/context/user-context.service'

for (const authenticated of [false, true]) {
  describe(`ContactsPageComponent authenticated=${authenticated}`, () => {
    it('offers the relevant support entry and preserves all contact destinations', () => {
      TestBed.configureTestingModule({ imports: [ContactsPageComponent], providers: [
        { provide: UserContextService, useValue: { isLoggedIn: signal(authenticated) } },
      ] })
      const fixture = TestBed.createComponent(ContactsPageComponent)
      fixture.detectChanges()
      const links = [...fixture.nativeElement.querySelectorAll('a')] as HTMLAnchorElement[]
      expect(links.some(item => item.getAttribute('href') === 'mailto:mercurion.app@gmail.com')).toBeTrue()
      expect(links.some(item => item.getAttribute('href') === 'mailto:giuliomarinelli25@pec.it')).toBeTrue()
      expect(fixture.nativeElement.textContent).toContain(authenticated ? 'Vai al supporto' : 'Accedi per aprire un ticket')
      expect(links.some(item => item.getAttribute('href') === '/terms-and-policies#aup')).toBeTrue()
    })
  })
}
