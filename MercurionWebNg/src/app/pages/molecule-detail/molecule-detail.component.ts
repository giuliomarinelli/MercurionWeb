import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MoleculeService } from '../../services/molecule.service';
import { switchMap, Observable } from 'rxjs';
import { MoleculeDetail } from '../../Models/graphql/molecule.detail';

@Component({
  selector: 'app-molecule-detail',
  standalone: true,
  imports: [],
  templateUrl: './molecule-detail.component.html',
  styleUrls: ['./molecule-detail.component.css']
})
export class MoleculeDetailComponent implements OnInit {

  molecule$!: Observable<MoleculeDetail>

  constructor(
    private readonly route: ActivatedRoute,
    private readonly moleculeService: MoleculeService
  ) {}

  ngOnInit(): void {
    this.molecule$ = this.route.paramMap.pipe(
      switchMap(params => {
        const molregno = params.get('molregno')
        if (!molregno) throw new Error('UndefinedMolregno')
        return this.moleculeService.getMoleculeByMolregno(molregno)
      })
    )
  }
}
