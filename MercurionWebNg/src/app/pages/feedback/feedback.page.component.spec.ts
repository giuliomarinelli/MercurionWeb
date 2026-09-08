import { ComponentFixture, TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { of } from 'rxjs';

import { FeedbackPageComponent } from './feedback.page.component';
import { FeedbackService } from '../../services/feedback.service';

describe('FeedbackPageComponent', () => {
  let component: FeedbackPageComponent;
  let fixture: ComponentFixture<FeedbackPageComponent>;
  let feedbackServiceSpy: jasmine.SpyObj<FeedbackService>;

  beforeEach(async () => {
    feedbackServiceSpy = jasmine.createSpyObj<FeedbackService>('FeedbackService', ['createFeedback']);
    feedbackServiceSpy.createFeedback.and.returnValue(of({} as any));

    await TestBed.configureTestingModule({
      imports: [FeedbackPageComponent],
      providers: [
        { provide: FeedbackService, useValue: feedbackServiceSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeedbackPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('deterministic ack-timer ownership', () => {
    it('hides the ack after exactly 4000ms and clears the tracked timer id', fakeAsync(() => {
      component.message.set('great app');
      component.submit();
      flushMicrotasks();

      expect((component as any).sendClicked()).toBeTrue();
      expect((component as any).timeOutBinding()).toBeTruthy();

      tick(4000);

      expect((component as any).sendClicked()).toBeFalse();
      expect((component as any).hideAck()).toBeTrue();
      expect((component as any).timeOutBinding()).toBeNull();
    }));

    it('a second submit before the ack timer fires cancels the stale timer deterministically', fakeAsync(() => {
      component.message.set('first');
      component.submit();
      flushMicrotasks();
      const firstTimerId = (component as any).timeOutBinding();
      expect(firstTimerId).toBeTruthy();

      tick(1000);

      component.message.set('second');
      component.submit();
      flushMicrotasks();
      const secondTimerId = (component as any).timeOutBinding();
      expect(secondTimerId).toBeTruthy();
      expect(secondTimerId).not.toBe(firstTimerId);

      // The stale first timer (scheduled at t=0) would have reached its
      // original 4000ms deadline at absolute t=4000, i.e. 2999ms from here
      // (current time is t=1000). Advancing to just before that point must
      // NOT clear/fire anything: proves the cancelled timer never runs.
      tick(2999);
      expect((component as any).timeOutBinding()).toBe(secondTimerId);

      // The real (second) timer was scheduled at t=1000 with its own fresh
      // 4000ms window, so it only reaches its deadline at absolute t=5000
      // (1001ms further than the stale-deadline check above).
      tick(1001);
      expect((component as any).timeOutBinding()).toBeNull();
      expect((component as any).hideAck()).toBeTrue();
    }));

    it('ngOnDestroy clears the pending ack timer so it cannot fire on a destroyed component', fakeAsync(() => {
      component.message.set('great app');
      component.submit();
      flushMicrotasks();
      expect((component as any).timeOutBinding()).toBeTruthy();

      fixture.destroy();

      expect((component as any).timeOutBinding()).toBeNull();

      // Advancing the clock must not throw or resurrect state on the destroyed instance.
      tick(4000);
      expect((component as any).timeOutBinding()).toBeNull();
    }));
  });
});
