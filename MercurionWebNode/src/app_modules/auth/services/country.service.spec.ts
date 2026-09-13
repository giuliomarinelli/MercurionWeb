import { CountryService } from './country.service';

describe('CountryService', () => {
  it('maps complete country rows to phone-prefix DTOs', async () => {
    const repoMock = { find: jest.fn().mockResolvedValue([
      { id: 1, iso2: 'IT', phonecode: '39' },
      { id: 2, iso2: null, phonecode: '1' },
      { id: 3, iso2: 'US', phonecode: null },
    ]) };
    const service = new CountryService(repoMock as any);

    await expect(service.getAllPhonePrefixes()).resolves.toEqual([
      { id: 1, iso2: 'IT', phonecode: '+39' },
    ]);
    expect(repoMock.find).toHaveBeenCalledWith({
      select: { id: true, iso2: true, phonecode: true },
    });
  });
});
