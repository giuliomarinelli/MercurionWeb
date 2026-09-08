import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComboSelectComponent } from './combo-select.component';

describe('ComboSelectComponent', () => {
  let component: ComboSelectComponent<any>;
  let fixture: ComponentFixture<ComboSelectComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComboSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComboSelectComponent);
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
