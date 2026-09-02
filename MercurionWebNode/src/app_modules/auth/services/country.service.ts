import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Country } from '../Models/entities/country.entity';
import { Repository } from 'typeorm';
import { PhonePrefixDTO } from '../Models/DTO/phone-prefix.dto';

@Injectable()
export class CountryService {

    constructor(
        @InjectRepository(Country)
        private readonly countryRepo: Repository<Country>
    ) { }

    async getAllPhonePrefixes(): Promise<PhonePrefixDTO[]> {
        const rows = await this.countryRepo.find({
            select: {
                id: true,
                iso2: true,                
                phonecode: true
            }
        })
        return rows.flatMap(({ id, iso2, phonecode }) =>
            iso2 && phonecode
                ? [{ id, iso2, phonecode: `+${phonecode}` }]
                : []
        )
    }

}
