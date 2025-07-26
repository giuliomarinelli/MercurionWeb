import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComboFatherComponent } from './combo-father.component';

describe('ComboFatherComponent', () => {
  let component: ComboFatherComponent;
  let fixture: ComponentFixture<ComboFatherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComboFatherComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComboFatherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
