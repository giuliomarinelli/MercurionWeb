import { CreateNoteDto } from './create-note.cls.dto';

describe('CreateNoteDto', () => {
  it('should store userId, title and content', () => {
    const dto = new CreateNoteDto();
    dto.userId = 'uuid' as any;
    dto.title = 'title';
    dto.content = 'text';
    expect(dto.title).toBe('title');
    expect(dto.content).toBe('text');
  });
});
