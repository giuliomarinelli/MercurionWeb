import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassicSpinnerComponent } from './classic-spinner.component';

describe('ClassicSpinnerComponent', () => {
  let component: ClassicSpinnerComponent;
  let fixture: ComponentFixture<ClassicSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassicSpinnerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClassicSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
