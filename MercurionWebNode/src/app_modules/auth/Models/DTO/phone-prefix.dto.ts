import { Country } from "../entities/country.entity";

export type PhonePrefixDTO = Omit<Country, 'emojiU' | 'latitude' | 'longitude' | 'name'>