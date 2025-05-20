import { NotebookSection } from './lab-notebook-section.entity';

describe('NotebookSection', () => {
  it('should instantiate a notebook section', () => {
    const section = new NotebookSection();
    expect(section).toBeInstanceOf(NotebookSection);
  });
});
