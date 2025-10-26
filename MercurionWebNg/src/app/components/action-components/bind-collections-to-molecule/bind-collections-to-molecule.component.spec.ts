import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BindCollectionsToMoleculeComponent } from './bind-collections-to-molecule.component';

describe('BindCollectionsToMoleculeComponent', () => {
  let component: BindCollectionsToMoleculeComponent;
  let fixture: ComponentFixture<BindCollectionsToMoleculeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BindCollectionsToMoleculeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BindCollectionsToMoleculeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
