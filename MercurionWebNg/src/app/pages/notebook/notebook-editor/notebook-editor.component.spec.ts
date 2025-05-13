import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotebookEditorComponent } from './notebook-editor.component';

describe('NotebookEditorComponent', () => {
  let component: NotebookEditorComponent;
  let fixture: ComponentFixture<NotebookEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotebookEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotebookEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
