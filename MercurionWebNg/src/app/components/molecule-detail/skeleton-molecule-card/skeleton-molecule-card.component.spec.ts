import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkeletonMoleculeCardComponent } from './skeleton-molecule-card.component';

describe('SkeletonMoleculeCardComponent', () => {
  let component: SkeletonMoleculeCardComponent;
  let fixture: ComponentFixture<SkeletonMoleculeCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonMoleculeCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SkeletonMoleculeCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
