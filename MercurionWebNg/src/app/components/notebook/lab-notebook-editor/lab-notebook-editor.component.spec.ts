import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabNotebookEditorComponent } from './lab-notebook-editor.component';

describe('LabNotebookEditorComponent', () => {
  let component: LabNotebookEditorComponent;
  let fixture: ComponentFixture<LabNotebookEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabNotebookEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LabNotebookEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
