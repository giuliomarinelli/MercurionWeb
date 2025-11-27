import { Country } from "../entities/country.entity";

export type PhonePrefixDTO = Omit<Country, 'emoji' | 'emojiU' | 'latitude' | 'longitude' | 'name'>