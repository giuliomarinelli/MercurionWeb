import { NotebookPage } from '../../../user/Models/entities/lab-notebook/lab-notebook-page.entity';

describe('NotebookPage', () => {
  it('should instantiate a notebook page', () => {
    const page = new NotebookPage();
    expect(page).toBeInstanceOf(NotebookPage);
  });
});
