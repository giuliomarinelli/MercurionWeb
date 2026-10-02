import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'

import type { MoleculeSearchResult } from '../../../Models/graphql/molecule-search/molecule-search-result.interface'
import { LiveMoleculeAnalogsComponent } from './live-molecule-analogs.component'

describe('LiveMoleculeAnalogsComponent', () => {
  let fixture: ComponentFixture<LiveMoleculeAnalogsComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveMoleculeAnalogsComponent],
      providers: [provideRouter([])]
    }).compileComponents()

    fixture = TestBed.createComponent(LiveMoleculeAnalogsComponent)
  })

  it('renders at most the requested number of compact analog rows', () => {
    const molecules = [1, 2, 3, 4].map(id => ({
      id,
      preferredName: `Analog ${id}`,
      preferredNameIt: `Analogo ${id}`,
      smiles: 'CCO',
      synonyms: [],
      mwFreebase: 46,
      alogp: 1,
      maxPhase: 2
    })) as MoleculeSearchResult[]

    fixture.componentRef.setInput('molecules', molecules)
    fixture.componentRef.setInput('limit', 3)
    fixture.detectChanges()

    const links = fixture.nativeElement.querySelectorAll('a')
    expect(links.length).toBe(3)
    expect(fixture.nativeElement.textContent).toContain('Analogo 1')
    expect(fixture.nativeElement.textContent).not.toContain('Analogo 4')
  })

  it('explains when the current structure has no embedding seed', () => {
    fixture.componentRef.setInput('unavailable', true)
    fixture.detectChanges()

    expect(fixture.nativeElement.textContent).toContain('non è ancora rappresentata nel corpus di embedding')
  })
})
