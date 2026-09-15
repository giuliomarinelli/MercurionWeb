import { LabNotebookLink } from './lab-notebook-link.entity';

describe('LabNotebookLink', () => {
  it('should instantiate a notebook link entity', () => {
    const entity = new LabNotebookLink();
    expect(entity).toBeInstanceOf(LabNotebookLink);
  });
});
