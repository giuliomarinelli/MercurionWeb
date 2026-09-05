import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingInputComponent } from './floating-input.component';

describe('FloatingInputComponent', () => {
  let component: FloatingInputComponent;
  let fixture: ComponentFixture<FloatingInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FloatingInputComponent);
    fixture.componentRef.setInput('label', 'Test input');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
