import { HttpExceptionFilter } from './http-exception-filter';

describe('HttpExceptionFilter', () => {
  it('should create an instance', () => {
    const filter = new HttpExceptionFilter();
    expect(filter).toBeInstanceOf(HttpExceptionFilter);
  });
});
