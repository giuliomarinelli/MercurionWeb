import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurnstileComponent } from './turnstile.component';

describe('TurnstileComponent', () => {
  let component: TurnstileComponent;
  let fixture: ComponentFixture<TurnstileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnstileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TurnstileComponent);
    component = fixture.componentInstance;

    // Stub external script integration
    (window as any).turnstile = { render: () => 'id', remove: () => undefined };
    spyOn(component as any, 'loadTurnstileScript').and.returnValue(Promise.resolve());
    spyOn(component as any, 'waitForWidgetVisible').and.returnValue(undefined as any);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
