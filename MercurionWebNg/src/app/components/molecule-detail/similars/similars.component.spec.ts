import { signal } from '@angular/core';
import { ViewportRuntimeService } from '../../../services/context/viewport-runtime.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimilarsComponent } from './similars.component';
import { SimilarItemComponent } from '../similar-item/similar-item.component';
import { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface';

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

describe('SimilarsComponent', () => {
  let component: SimilarsComponent;
  let fixture: ComponentFixture<SimilarsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimilarsComponent],
      // Isolate content animation from document scrollbar-induced viewport changes.
      providers: [{ provide: ViewportRuntimeService, useValue: { state: signal({
        width: 1024, height: 768, visualWidth: 1024, visualHeight: 768, scale: 1
      }) } }]
    })
    .overrideComponent(SimilarItemComponent, {
      set: { imports: [], template: '<div style="height: 500px"></div>' }
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimilarsComponent);
    fixture.componentRef.setInput('molecules', []);
    fixture.componentRef.setInput('onlyKnown', false);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('distinguishes filter-empty results from request errors and exposes retry', () => {
    fixture.componentRef.setInput('onlyKnown', true); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Deseleziona');
    fixture.componentRef.setInput('error', true); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    const retry = jasmine.createSpy(); component.retry.subscribe(retry);
    fixture.nativeElement.querySelector('button').click(); expect(retry).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).not.toContain('Deseleziona');
  });

  it('should create' , () => {
    expect(component).toBeTruthy();
  });

  it('follows the request loading state instead of a timer', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="region"]').getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('m-skeleton-molecule-card').length).toBe(2);
    expect(fixture.nativeElement.querySelector('p')).toBeNull();

    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="region"]').getAttribute('aria-busy')).toBe('false');
    expect(fixture.nativeElement.querySelectorAll('m-skeleton-molecule-card').length).toBe(0);
    expect(fixture.nativeElement.querySelector('p')?.textContent).toContain('Nessun analogo suggerito disponibile');

    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('m-skeleton-molecule-card').length).toBe(2);
  });

  it('animates expansion and contraction with the scroll limits inside the animated wrapper', async () => {
    const wrapper = fixture.nativeElement.firstElementChild as HTMLElement;
    const settle = async (from: number, to: number) => {
      fixture.detectChanges();
      await nextFrame();
      await nextFrame();
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const animation = wrapper.getAnimations()[0];
        expect(animation).toBeTruthy();
        expect(wrapper.getBoundingClientRect().height).toBeGreaterThan(Math.min(from, to));
        expect(wrapper.getBoundingClientRect().height).toBeLessThan(Math.max(from, to));
        await animation.finished;
      }
      expect(wrapper.getBoundingClientRect().height).toBe(to);
    };
    await nextFrame();
    await nextFrame();
    expect(wrapper.getBoundingClientRect().height).toBe(90);

    fixture.componentRef.setInput('molecules', [{} as MoleculeSearchResult]);
    await settle(90, 420);
    fixture.componentRef.setInput('onlyKnown', true);
    await settle(420, 320);
    fixture.componentRef.setInput('molecules', []);
    await settle(320, 90);
  });
});
