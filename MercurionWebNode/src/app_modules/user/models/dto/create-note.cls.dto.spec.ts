import { CreateNoteDto } from './create-note.cls.dto';

describe('CreateNoteDto', () => {
  it('should store userId, title and content', () => {
    const dto = new CreateNoteDto();
    dto.userId = '00000000-0000-0000-0000-000000000000';
    dto.title = 'title';
    dto.content = 'text';
    expect(dto.title).toBe('title');
    expect(dto.content).toBe('text');
  });
});
