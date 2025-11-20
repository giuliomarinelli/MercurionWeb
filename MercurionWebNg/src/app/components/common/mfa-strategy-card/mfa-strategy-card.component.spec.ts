import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MfaStrategyCardComponent } from './mfa-strategy-card.component';

describe('MfaStrategyCardComponent', () => {
  let component: MfaStrategyCardComponent;
  let fixture: ComponentFixture<MfaStrategyCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MfaStrategyCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MfaStrategyCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
