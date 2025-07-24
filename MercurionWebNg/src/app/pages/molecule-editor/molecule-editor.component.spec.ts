import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeEditorComponent } from './molecule-editor.component';

describe('MoleculeEditorComponent', () => {
  let component: MoleculeEditorComponent;
  let fixture: ComponentFixture<MoleculeEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
