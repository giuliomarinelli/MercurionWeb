import { TestBed } from '@angular/core/testing';

import { SidenavContextService } from './sidenav-context.service';

describe('SidenavContextService', () => {
  let service: SidenavContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SidenavContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('starts already open/mounted/visible synchronously (no flicker on app init)', () => {
    expect(service.isOpen()).toBeTrue();
    expect(service.isMounted()).toBeTrue();
    expect(service.isVisible()).toBeTrue();
  });

  it('collapses to a visible, mounted rail and handles rapid toggles synchronously', () => {
    service.close();
    expect(service.isOpen()).toBeFalse();
    expect(service.isMounted()).toBeTrue();
    expect(service.isVisible()).toBeTrue();
    service.toggle();
    service.toggle();
    service.open();
    service.close();
    expect(service.isOpen()).toBeFalse();
    expect(service.isMounted()).toBeTrue();
    expect(service.isVisible()).toBeTrue();
    service.open();
    expect(service.isOpen()).toBeTrue();
  });
});
