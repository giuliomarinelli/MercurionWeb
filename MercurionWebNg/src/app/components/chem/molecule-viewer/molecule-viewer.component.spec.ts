import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { Subject } from 'rxjs';
import type { RDKitModule } from '@rdkit/rdkit';

import { MoleculeViewerComponent } from './molecule-viewer.component';
import { RDKitService } from '../../../services/rd-kit.service';

describe('MoleculeViewerComponent', () => {
  let component: MoleculeViewerComponent;
  let fixture: ComponentFixture<MoleculeViewerComponent>;
  let instance$: Subject<RDKitModule>;

  beforeEach(async () => {
    instance$ = new Subject<RDKitModule>();
    await TestBed.configureTestingModule({
      imports: [MoleculeViewerComponent],
      providers: [{ provide: RDKitService, useValue: { instance$ } }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('releases the RDKit stream when destroyed', () => {
    component.disablePreview = true;
    fixture.detectChanges();

    component.disablePreview = false;
    component.ngOnChanges({
      disablePreview: new SimpleChange(true, false, false)
    });

    expect(instance$.observed).toBeTrue();

    fixture.destroy();
    expect(instance$.observed).toBeFalse();
  });


  describe('scheduleRender idle-job ownership', () => {
    let ricSpy: jasmine.Spy;
    let cicSpy: jasmine.Spy;
    let scheduled: { id: number; cb: () => void }[];
    let nextId: number;

    beforeEach(() => {
      scheduled = [];
      nextId = 1;
      ricSpy = spyOn(window as any, 'requestIdleCallback').and.callFake((cb: any) => {
        const id = nextId++;
        scheduled.push({ id, cb: () => cb({ didTimeout: true, timeRemaining: () => 0 }) });
        return id;
      });
      cicSpy = spyOn(window as any, 'cancelIdleCallback').and.callFake((id: number) => {
        scheduled = scheduled.filter(s => s.id !== id);
      });

      // Establish one known-baseline scheduled job under the spy, discarding
      // any call recorded from component construction (which ran before the
      // spy existed) so the following assertions are exact.
      (component as any).scheduleRender();
      ricSpy.calls.reset();
      cicSpy.calls.reset();
    });

    function runPending(): void {
      const items = scheduled;
      scheduled = [];
      items.forEach(s => s.cb());
    }

    it('a rapid re-render request cancels the previously scheduled idle callback (no duplicate scheduling)', () => {
      const beforeCount = scheduled.length;
      expect(beforeCount).toBe(1);

      (component as any).scheduleRender();

      expect(cicSpy).toHaveBeenCalledTimes(1);
      expect(ricSpy).toHaveBeenCalledTimes(1);
      expect(scheduled.length).toBe(1);
    });

    it('ngOnDestroy cancels the pending idle callback and guards against a late-firing stale job', () => {
      expect(scheduled.length).toBe(1);

      fixture.destroy();

      expect(cicSpy).toHaveBeenCalledTimes(1);

      // Even if a stale callback somehow still fires post-destroy, the
      // internal destroyed guard must prevent it from invoking renderSvg().
      const renderSpy = spyOn(component as any, 'renderSvg');
      runPending();
      expect(renderSpy).not.toHaveBeenCalled();
    });
  });
});
