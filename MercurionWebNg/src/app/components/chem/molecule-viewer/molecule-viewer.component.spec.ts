import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { Subject } from 'rxjs';
import type { RDKitModule } from '@rdkit/rdkit';

import { MoleculeViewerComponent } from './molecule-viewer.component';
import { RDKitService } from '../../../services/rd-kit.service';

describe('MoleculeViewerComponent', () => {
  let component: MoleculeViewerComponent;
  let fixture: ComponentFixture<MoleculeViewerComponent>;
  let instance$: Subject<RDKitModule>;

  beforeEach(async () => {
    instance$ = new Subject<RDKitModule>();
    await TestBed.configureTestingModule({
      imports: [MoleculeViewerComponent],
      providers: [{ provide: RDKitService, useValue: { instance$ } }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('releases the RDKit stream when destroyed', () => {
    component.disablePreview = true;
    fixture.detectChanges();

    component.disablePreview = false;
    component.ngOnChanges({
      disablePreview: new SimpleChange(true, false, false)
    });

    expect(instance$.observed).toBeTrue();

    fixture.destroy();
    expect(instance$.observed).toBeFalse();
  });
});
