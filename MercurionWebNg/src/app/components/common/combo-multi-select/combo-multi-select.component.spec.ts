import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComboMultiSelectComponent } from './combo-multi-select.component';

describe('ComboMultiSelectComponent', () => {
  let component: ComboMultiSelectComponent;
  let fixture: ComponentFixture<ComboMultiSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComboMultiSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComboMultiSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
