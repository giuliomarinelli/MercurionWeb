import { TestBed } from '@angular/core/testing';
import { BASE_PATH } from './base-path.token';
import { PublicPipe } from './public.pipe';

describe('PublicPipe', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PublicPipe,
        { provide: BASE_PATH, useValue: '/' }
      ]
    });
  });

  it('resolves public assets from the document root', () => {
    const pipe = TestBed.inject(PublicPipe);

    expect(pipe.transform('logo/pictogram-light-logo.svg'))
      .toBe('/logo/pictogram-light-logo.svg');
    expect(pipe.transform('/welcome/search-light.png'))
      .toBe('/welcome/search-light.png');
  });
});
