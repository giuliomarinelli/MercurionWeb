import { UpdateNoteDto } from './update-note.cls.dto';

describe('UpdateNoteDto', () => {
  it('should allow optional title and content', () => {
    const dto = new UpdateNoteDto();
    dto.title = 'new';
    expect(dto.title).toBe('new');
    expect(dto.content).toBeUndefined();
  });
});
