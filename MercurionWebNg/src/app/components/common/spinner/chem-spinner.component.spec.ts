import { ChemSpinnerComponent } from './chem-spinner.component';

describe('ChemSpinnerComponent', () => {
  it('should expose default size and hexagon points', () => {
    const component = new ChemSpinnerComponent();
    expect(component.size).toBe(64);
    expect(component.points.length).toBe(6); // benzene hexagon
  });
});
