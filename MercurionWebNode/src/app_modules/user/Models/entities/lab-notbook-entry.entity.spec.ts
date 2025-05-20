import { LabNotebookEntry } from './lab-notbook-entry.entity';

describe('LabNotebookEntry', () => {
  it('should create a notebook entry instance', () => {
    const entity = new LabNotebookEntry();
    expect(entity).toBeInstanceOf(LabNotebookEntry);
  });
});
