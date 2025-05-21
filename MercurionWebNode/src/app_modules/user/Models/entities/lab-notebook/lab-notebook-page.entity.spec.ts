import { NotebookPage } from './lab-notebook-page.entity';

describe('NotebookPage', () => {
  it('should instantiate a notebook page', () => {
    const page = new NotebookPage();
    expect(page).toBeInstanceOf(NotebookPage);
  });
});
