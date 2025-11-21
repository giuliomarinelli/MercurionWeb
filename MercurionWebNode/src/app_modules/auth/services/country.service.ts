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
                emoji: true,
                phonecode: true
            }
        })
        return rows.map((r) => {
            const { id, iso2, emoji, phonecode } = r
            return ({
                id,
                iso2,
                emoji,
                phonecode: phonecode ? `+${phonecode}` : null
            })
        }).filter((dto) => dto.phonecode != null && dto.iso2 != null && dto.emoji != null)
    }

}
