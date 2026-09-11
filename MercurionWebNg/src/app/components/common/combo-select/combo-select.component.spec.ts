import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComboSelectComponent } from './combo-select.component';

describe('ComboSelectComponent', () => {
  let component: ComboSelectComponent<string, string>;
  let fixture: ComponentFixture<ComboSelectComponent<string, string>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComboSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComboSelectComponent<string, string>);
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('displayFn', (item: string) => item);
    fixture.componentRef.setInput('valueFn', (item: string) => item);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
