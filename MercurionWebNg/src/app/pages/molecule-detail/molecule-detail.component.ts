import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MoleculeService } from '../../services/molecule.service';
import { switchMap, Observable, catchError, of } from 'rxjs';
import { MoleculeDetail } from '../../Models/graphql/molecule.detail';
import { AsyncPipe } from '@angular/common';
import { MoleculeHeaderComponent } from '../../components/molecule-detail/molecule-header/molecule-header.component';
import { MoleculeViewerComponent } from '../../components/chem/molecule-viewer/molecule-viewer.component';
import { MoleculePropertiesComponent } from '../../components/molecule-detail/molecule-properties/molecule-properties.component';
import { MoleculeRoutesComponent } from '../../components/molecule-detail/molecule-routes/molecule-routes.component';
import { MoleculeSynonymsComponent } from '../../components/molecule-detail/molecule-synonyms/molecule-synonyms.component';
import { MoleculeCtaChemblComponent } from '../../components/molecule-detail/molecule-cta-chembl/molecule-cta-chembl.component';
import { ThemeManagerService } from '../../services/stores/theme-manager.service';

@Component({
  selector: 'app-molecule-detail',
  standalone: true,
  imports: [
    AsyncPipe,
    MoleculeHeaderComponent,
    MoleculeViewerComponent,
    MoleculePropertiesComponent,
    MoleculeRoutesComponent,
    MoleculeSynonymsComponent,
    MoleculeCtaChemblComponent
  ],
  template: `

    @if (molecule$ | async; as molecule) {
  <section class="max-w-4xl mx-auto p-6 space-y-6">

    <!-- 🧬 Header: nome + ChEMBL ID -->

    <molecule-header class="block mb-6"
      [nameInput]="molecule.preferredName"
      [chemblIdInput]="molecule.cmbId"
    />

      <h4 class="font-semibold text-emerald-600 dark:text-dark-accent-secondary text-center xs:text-left text-lg">
        Struttura
      </h4>

    <!-- 🧪 Viewer struttura SMILES -->
    <molecule-viewer class="flex justify-center xs:justify-start mb-4"
      [structure]="molecule.canonicalSmiles" [darkMode]="themeManager.theme() === 'dark'"
    />

    <!-- ⚗️ Proprietà chimico-fisiche -->
    <molecule-properties class="block mb-12"
      [properties]="molecule.properties"
    />

    <!-- 💉 Vie di somministrazione -->
    <molecule-routes
      [adminRoutesInput]="molecule.administrationRoutes"
    />

    <!-- 🗂 Sinonimi -->
    <molecule-synonyms
      [synonymsInput]="molecule.synonyms"
    />

    <!-- 🔗 Link esterno a ChEMBL -->
    <molecule-cta-chembl
      [chemblId]="molecule.cmbId"
    />

  </section>
} @else {
  <section class="max-w-4xl mx-auto p-6">
    <p class="text-gray-600 dark:text-gray-300 text-sm">Caricamento molecola...</p>
  </section>
}

  `
})
export class MoleculeDetailComponent implements OnInit {

  molecule$!: Observable<MoleculeDetail | null>

  constructor(
    private readonly route: ActivatedRoute,
    private readonly moleculeService: MoleculeService,
    protected readonly themeManager: ThemeManagerService
  ) {}

  ngOnInit(): void {
  this.molecule$ = this.route.paramMap.pipe(
    switchMap(params => {
      const molregno = params.get('molregno')
      if (!molregno) throw new Error('UndefinedMolregno')
      return this.moleculeService.getMoleculeByMolregno(molregno)
    }),
    catchError((err: any) => {
  console.error('Errore durante il fetch della molecola:', err)

  const netErr = err?.networkError

  if (netErr && 'status' in netErr) {
    console.error('HTTP status:', netErr.status)

    if ('bodyText' in netErr) {
      console.error('Body della risposta:', netErr.bodyText)
    }

    // per Axios o fetch:
    if ('response' in netErr) {
      console.error('Raw response:', netErr.response)
    }
  }

  return of(null)
})

  )
}
}
