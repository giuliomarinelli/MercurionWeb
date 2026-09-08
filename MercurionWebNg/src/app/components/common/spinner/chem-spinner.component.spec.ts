import { ChemSpinnerComponent } from './chem-spinner.component';
import { TestBed } from '@angular/core/testing';

describe('ChemSpinnerComponent', () => {
  it('should expose default size and hexagon points', async () => {
    await TestBed.configureTestingModule({ imports: [ChemSpinnerComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ChemSpinnerComponent);
    const component = fixture.componentInstance;
    expect(component.size()).toBe(64);
    expect(component.points.length).toBe(6); // benzene hexagon
  });
});
