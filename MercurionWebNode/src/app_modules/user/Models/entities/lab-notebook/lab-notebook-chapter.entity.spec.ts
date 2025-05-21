import { NotebookChapter } from './lab-notebook-chapter.entity';

describe('NotebookChapter', () => {
  it('should instantiate a notebook chapter', () => {
    const chapter = new NotebookChapter();
    expect(chapter).toBeInstanceOf(NotebookChapter);
  });
});
