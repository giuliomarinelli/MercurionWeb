import { Controller, Get } from '@nestjs/common';
import { CountryService } from '../services/country.service';
import { PhonePrefixDTO } from '../Models/DTO/phone-prefix.dto';

@Controller('countries')
export class CountryController {

    constructor(private readonly countryService: CountryService) { }

    @Get('/phone-prefixes')
    async getAllPhonePrefixes(): Promise<PhonePrefixDTO[]> {
        return this.countryService.getAllPhonePrefixes()
    }

}
