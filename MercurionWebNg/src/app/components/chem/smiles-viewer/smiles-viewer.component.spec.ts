import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SmilesViewerComponent } from './smiles-viewer.component';

describe('SmilesViewerComponent', () => {
  let component: SmilesViewerComponent;
  let fixture: ComponentFixture<SmilesViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmilesViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SmilesViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
