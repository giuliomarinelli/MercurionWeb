import { PublicPipe } from './public.pipe';

describe('PublicPipe', () => {
  it('create an instance', () => {
    const pipe = new PublicPipe();
    expect(pipe).toBeTruthy();
  });
});
