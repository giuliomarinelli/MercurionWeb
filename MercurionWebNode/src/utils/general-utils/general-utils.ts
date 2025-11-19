import { BadRequestException } from "@nestjs/common";
import { MfaStrategy } from "src/app_modules/user/Models/enums/mfa-strategy.enum";

export class GeneralUtils {

    private static readonly uuidV7Re = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    public static getEnumValue<T extends object>(enumType: T, value: string | number): T[keyof T] | undefined {
        return Object.values(enumType).find((val) => val === value) as T[keyof T] | undefined
    }


    public static getEnumValueFromStringKey<T extends object>(enumType: T, key: string): T[keyof T] | undefined {
        // Verifica se la chiave esiste nell'enum
        if (key in enumType) {
            return enumType[key as keyof T];
        }
        return undefined; // Ritorna undefined se la chiave non è valida
    }

    static getEnumKeyByValue<T extends object>(enumType: T, value: T[keyof T] | string): string | undefined {
        // Itera attraverso le chiavi dell'enum
        for (const key in enumType) {
            if (enumType[key as keyof T] === value) {
                return key; // Ritorna la chiave corrispondente al valore
            }
        }
        return undefined; // Ritorna undefined se non trova il valore
    }

    public static validateMfaStrategy(strategyKey: string | undefined): MfaStrategy | never {
        if (!strategyKey) {
            throw new BadRequestException('strategy is required')
        }
        const strategy = this.getEnumValueFromStringKey(MfaStrategy, strategyKey)
        if (!strategy) {
            throw new BadRequestException('Invalid strategy')
        }
        return strategy
    }

    public static distinctArray<T>(arr: T[]): T[] {
        const set: Set<T> = new Set(arr)
        return Array.from(set)
    }

    public static normalizeSpaces(input: string): string {
        return input
            .trim()
            .replace(/\s+/g, ' ')
    }

    public static isValidUUIDv7(uuid: string): boolean {
        return this.uuidV7Re.test(uuid)
    }

}
