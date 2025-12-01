import { CountryService } from './country.service';

describe('CountryService', () => {
  it('should be defined', () => {
    const repoMock = { find: jest.fn() };
    const service = new CountryService(repoMock as any);
    expect(service).toBeDefined();
  });
});
