import { CountryController } from './country.controller';
import { CountryService } from '../services/country.service';

describe('CountryController', () => {
  it('should be defined', () => {
    const controller = new CountryController({} as unknown as CountryService);
    expect(controller).toBeDefined();
  });
});
