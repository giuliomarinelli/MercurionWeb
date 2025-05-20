import { Component } from '@angular/core';
import { LabNotebookEditorComponent } from '../../../components/notebook/lab-notebook-editor/lab-notebook-editor.component';

@Component({
  selector: 'lab-notebook-edit-component',
  imports: [LabNotebookEditorComponent],
  template: `

    <lab-notebook-editor />

  `
})
export class NotebookEditComponent {

}
