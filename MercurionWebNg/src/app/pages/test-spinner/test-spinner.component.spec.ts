import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestSpinnerComponent } from './test-spinner.component';

describe('TestSpinnerComponent', () => {
  let component: TestSpinnerComponent;
  let fixture: ComponentFixture<TestSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestSpinnerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
