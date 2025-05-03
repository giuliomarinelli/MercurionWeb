import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxxSpinnerComponent } from './ngxx-spinner.component';

describe('NgxxSpinnerComponent', () => {
  let component: NgxxSpinnerComponent;
  let fixture: ComponentFixture<NgxxSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxxSpinnerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxxSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
