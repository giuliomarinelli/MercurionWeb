import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidenavComponent } from './sidenav.component';
import { signal } from '@angular/core';
import { UserContextService } from '../../../services/context/user-context.service';
import { DesignService } from '../../../services/design.service';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Tooltip } from 'primeng/tooltip';

describe('SidenavComponent', () => {
  let component: SidenavComponent;
  let fixture: ComponentFixture<SidenavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidenavComponent],
      providers: [{ provide: UserContextService, useValue: { isLoggedIn: signal(true), isLoggedOut: signal(false) } }]
    })
    .compileComponents();

    spyOn(TestBed.inject(DesignService), 'maxBk').and.returnValue(signal(false));
    spyOnProperty(TestBed.inject(Router), 'url', 'get').and.returnValue('/molecules/collections');
    fixture = TestBed.createComponent(SidenavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps all functions expanded and uses the navigation as the only scroll root', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('m-disclosure')).toBeNull();
    expect(root.querySelectorAll('.sidebar-link').length).toBe(4);
    expect(root.querySelector('m-history')).not.toBeNull();
    expect(getComputedStyle(root.querySelector('nav')!).overflowY).toBe('auto');
    expect(getComputedStyle(root.querySelector('.m-navigation-history')!).overflowY).toBe('visible');
    expect(root.querySelector('a[aria-current="page"]')?.getAttribute('aria-label')).toBe('Le mie collezioni');
  });

  it('unmounts history and enables accessible tooltips only in the desktop rail', () => {
    fixture.componentRef.setInput('desktop', true);
    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('m-history')).toBeNull();
    expect(root.querySelector('h6')).toBeNull();
    expect(root.querySelector('.m-navigation-toggle')?.getAttribute('aria-label')).toBe('Espandi sidebar');
    for (const node of fixture.debugElement.queryAll(By.directive(Tooltip))) {
      const tooltip = node.injector.get(Tooltip);
      expect(tooltip.disabled).toBeFalse();
      expect(tooltip.tooltipEvent).toBe('both');
      expect(node.nativeElement.getAttribute('aria-label')).toBeTruthy();
    }
    fixture.componentRef.setInput('desktop', false);
    fixture.detectChanges();
    expect(root.querySelector('m-history')).not.toBeNull();
    expect(root.querySelector('.m-navigation-toggle')).toBeNull();
    expect(root.querySelector('.m-navigation--collapsed')).toBeNull();
  });
});
