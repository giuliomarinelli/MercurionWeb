import { Component } from '@angular/core';
import { KetcherFrameComponent } from '../../components/chem/ketcher-frame/ketcher-frame.component';

@Component({
  selector: 'app-molecule-editor',
  imports: [KetcherFrameComponent],
  template: `

    <app-ketcher-frame
       [smiles]=""
       [mode]="'edit'"
       (exportSmiles)="onSmilesExported($event)"
    />

  `
})
export class MoleculeEditorComponent {

  onSmilesExported(e: string) {
    console.log(e)
  }

}
