import { Component, signal } from '@angular/core';
import { utcInstantFromEpochMs } from '@mercurion/rest-contracts';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewportRuler } from '@angular/cdk/scrolling';
import { of, Subject } from 'rxjs';
import { HeaderComponent } from './components/common/header/header.component';
import { FooterComponent } from './components/common/footer/footer.component';
import { ButtonComponent } from './components/common/button/button.component';
import { SessionCardComponent } from './components/common/session-card/session-card.component';
import { MoleculeCollectionDetailToolbarComponent } from './pages/molecule-collection-detail/molecule-collection-detail-toolbar.component';
import { SettingsContactPanelComponent } from './pages/settings/settings-contact-panel.component';
import { SettingsAccountFacade } from './pages/settings/settings-account.facade';
import { UserContextService } from './services/context/user-context.service';
import { AccountService } from './services/account.service';
import { InAppNotificationService } from './services/in-app-notification.service';
import { Router } from '@angular/router';
import { SessionDTOExt } from './Models/account/account.models';

@Component({
  imports: [HeaderComponent, FooterComponent, ButtonComponent, SessionCardComponent,
    MoleculeCollectionDetailToolbarComponent, SettingsContactPanelComponent],
  template: `
    <m-header />
    <main class="p-4 min-w-0">
      <m-molecule-collection-detail-toolbar collectionId="collection-1" [name]="longName" />
      <m-settings-contact-panel />
      <m-session-card [session]="session" />
      <m-button variant="outline">{{ longName }}</m-button>
    </main>
    <m-footer />
  `
})
class PhoneLayoutHost {
  readonly longName = 'CollezioneMolecolareConUnNomeMoltoLungo'.repeat(4);
  readonly session = {
    id: 'session-id.' + 'a'.repeat(64), current: true, valid: true, isBeingDeleted: false,
    provider: 'Mercurion', browser: 'Safari', location: 'UnaLocalitaConUnNomeMoltoLungo'.repeat(5),
    createdAt: utcInstantFromEpochMs(Date.parse('2026-10-06T10:00:00Z')),
    lastAccessedAt: utcInstantFromEpochMs(Date.parse('2026-10-06T10:00:00Z')),
    expiresAt: utcInstantFromEpochMs(Date.parse('2026-11-06T10:00:00Z')), triggerDisappear: signal(false)
  } satisfies SessionDTOExt;
}

describe('Shared frontend layouts on a small phone', () => {
  let fixture: ComponentFixture<PhoneLayoutHost>;
  let frame: HTMLIFrameElement;
  let width: number;
  let changes: Subject<Event>;

  afterEach(() => {
    fixture?.destroy();
    frame?.remove();
  });

  async function render(viewportWidth: number, height: number) {
    width = viewportWidth;
    changes = new Subject<Event>();
    await TestBed.configureTestingModule({
      imports: [PhoneLayoutHost],
      providers: [
        { provide: ViewportRuler, useValue: { getViewportSize: () => ({ width, height }), change: () => changes } },
        { provide: UserContextService, useValue: { isLoggedIn: signal(true), isLoggedOut: signal(false), initials: signal('AB') } },
        { provide: AccountService, useValue: { getProvidedAccountId: () => of(null) } },
        { provide: InAppNotificationService, useValue: {
          unreadCount: signal(0), catchUpCount: signal(0), dismissCatchUp: jasmine.createSpy(),
          acknowledgeCatchUpPresented: jasmine.createSpy()
        } },
        { provide: SettingsAccountFacade, useValue: { isSso: signal(false), profile: signal({
          accountIdKind: 'email', obscuredAccountId: 'nome.cognome.molto.lungo@example.com',
          obscuredPhone: '+39 333 *** 1234'
        }) } }
      ]
    }).compileComponents();
    spyOnProperty(TestBed.inject(Router), 'url', 'get').and.returnValue('/molecules/detail/1714574');
    fixture = TestBed.createComponent(PhoneLayoutHost);
    fixture.detectChanges();
    frame = document.createElement('iframe');
    frame.style.cssText = `width:${width}px;height:${height}px;border:0;display:block`;
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    const style = doc.createElement('style');
    style.textContent = Array.from(document.styleSheets)
      .flatMap(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText)).join('\n');
    doc.head.appendChild(style);
    doc.body.style.margin = '0';
    doc.body.appendChild(fixture.nativeElement);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    return doc;
  }

  for (const viewport of [{ width: 375, height: 812 }, { width: 640, height: 375 },
    { width: 767, height: 375 }, { width: 768, height: 375 }, { width: 812, height: 375 },
    { width: 1024, height: 768 }, { width: 1279, height: 768 }, { width: 1280, height: 768 }]) {
    it(`keeps controls and long content contained at ${viewport.width}px`, async () => {
      const doc = await render(viewport.width, viewport.height);
      expect(doc.documentElement.scrollWidth).withContext('document overflow').toBeLessThanOrEqual(viewport.width);
      for (const node of doc.querySelectorAll('main button, main strong, main h2, m-header header button, m-header header img')) {
        const bounds = node.getBoundingClientRect();
        expect(bounds.left).withContext(node.textContent ?? node.tagName).toBeGreaterThanOrEqual(0);
        expect(bounds.right).withContext(node.textContent ?? node.tagName).toBeLessThanOrEqual(viewport.width + 1);
      }
      expect(Boolean(doc.querySelector('m-header header h3')))
        .withContext('desktop slogan must not mount before lg').toBe(viewport.width >= 1024);
      expect(doc.querySelectorAll('m-header header img').length).withContext('exactly one logo at all widths').toBe(1);
      const accountInHeader = doc.querySelector('m-header header m-header-session-indicator');
      const accountInSidebar = doc.querySelector('.off-canvas-menu-container m-header-session-indicator');
      expect(Boolean(accountInHeader)).toBe(viewport.width >= 768);
      expect(Boolean(accountInSidebar)).toBe(viewport.width < 768);
      expect(Boolean(doc.querySelector('m-header header button[aria-label="Apri o chiudi menu laterale"]')))
        .withContext('navigation stays accessible until the persistent sidebar replaces it').toBe(viewport.width < 1280);
    });
  }

  for (const width of [375, 393, 432]) {
    it(`uses the entire phone width for the open sidebar at ${width}px`, async () => {
      const doc = await render(width, 900);
      const trigger = doc.querySelector<HTMLButtonElement>('button[aria-label="Apri o chiudi menu laterale"]')!;
      trigger.click();
      fixture.detectChanges();
      const sidebar = doc.querySelector<HTMLElement>('.off-canvas-menu-container')!;
      sidebar.style.transition = 'none';
      const availableWidth = doc.documentElement.clientWidth;
      expect(sidebar.getBoundingClientRect().width).toBeCloseTo(availableWidth, 0);
      expect(sidebar.getBoundingClientRect().left).toBeCloseTo(0, 0);
      expect(sidebar.getBoundingClientRect().right).toBeCloseTo(availableWidth, 0);
    });
  }
});
