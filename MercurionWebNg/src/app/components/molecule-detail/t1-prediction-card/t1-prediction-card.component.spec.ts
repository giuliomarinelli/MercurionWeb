import { ComponentFixture, TestBed } from '@angular/core/testing';

import { T1PredictionCardComponent } from './t1-prediction-card.component';

describe('T1PredictionCardComponent', () => {
  let component: T1PredictionCardComponent;
  let fixture: ComponentFixture<T1PredictionCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [T1PredictionCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(T1PredictionCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
