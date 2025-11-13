import { LabNotebook } from './lab-notebook.entity';

describe('LabNotebook', () => {
  it('should instantiate a lab notebook aggregate', () => {
    const notebook = new LabNotebook();
    expect(notebook).toBeInstanceOf(LabNotebook);
  });
});
