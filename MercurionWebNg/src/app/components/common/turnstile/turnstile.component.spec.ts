import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurnstileComponent } from './turnstile.component';

describe('TurnstileComponent', () => {
  let component: TurnstileComponent;
  let fixture: ComponentFixture<TurnstileComponent>;
  let previousTurnstile: Window['turnstile'];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnstileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TurnstileComponent);
    component = fixture.componentInstance;

    // Stub external script integration
    previousTurnstile = window.turnstile;
    window.turnstile = { render: () => 'id', remove: () => undefined, reset: jasmine.createSpy('reset') };
    spyOn(component as any, 'loadTurnstileScript').and.returnValue(Promise.resolve());
    spyOn(component as any, 'waitForWidgetVisible').and.returnValue(undefined as any);

    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    window.turnstile = previousTurnstile;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('resets the rendered widget and notifies its parent', () => {
    const refreshed = jasmine.createSpy('refreshed');
    component.refresh.subscribe(refreshed);

    component.reset();

    expect(window.turnstile!.reset).toHaveBeenCalledWith('id');
    expect(refreshed).toHaveBeenCalled();
  });
});
