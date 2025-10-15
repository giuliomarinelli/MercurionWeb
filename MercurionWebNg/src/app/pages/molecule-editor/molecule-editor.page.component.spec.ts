import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeEditorPageComponent } from './molecule-editor.page.component';

describe('MoleculeEditorComponent', () => {
  let component: MoleculeEditorPageComponent;
  let fixture: ComponentFixture<MoleculeEditorPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeEditorPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeEditorPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
