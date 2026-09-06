import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComboMultiSelectComponent } from './combo-multi-select.component';

describe('ComboMultiSelectComponent', () => {
  let component: ComboMultiSelectComponent<any>;
  let fixture: ComponentFixture<ComboMultiSelectComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComboMultiSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComboMultiSelectComponent);
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('displayFn', (item: unknown) => String(item));
    fixture.componentRef.setInput('valueFn', (item: unknown) => item);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
