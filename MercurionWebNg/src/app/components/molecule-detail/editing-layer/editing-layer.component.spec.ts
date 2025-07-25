import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditingLayerComponent } from './editing-layer.component';

describe('EditingLayerComponent', () => {
  let component: EditingLayerComponent;
  let fixture: ComponentFixture<EditingLayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditingLayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditingLayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
