import { HttpStatusMap } from './http-status-map';

describe('HttpStatusMap', () => {
  it('should map status code to description', () => {
    const desc = HttpStatusMap.getDescriptionFromHttpStatusCode(200);
    expect(desc).toBe('OK');
  });
});
