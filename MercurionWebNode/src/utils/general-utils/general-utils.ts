import { BadRequestException } from "@nestjs/common";
import { Pagination } from "nestjs-typeorm-paginate";
import { MfaStrategy } from "src/app_modules/user/Models/enums/mfa-strategy.enum";
import { FlatPagination } from "src/Models/flat-pagination.interface";

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

    static getEnumKeyByValue<T extends object>(enumType: T, value: T[keyof T] | string): Extract<keyof T, string> | undefined {
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

    public static normalizePersonName(input: string): string {
        const parts = this.normalizeSpaces(input).split(/\s/).filter(Boolean)
        return parts
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join(' ')
    }

    public static normalizeEmail(input: string): string {
        return input.trim().toLowerCase()
    }

    public static isValidUUIDv7(uuid: string): boolean {
        return this.uuidV7Re.test(uuid)
    }

    public static ensureValidUUIDv7(uuid: unknown, errorMessage?: string): asserts uuid is string {
        if (typeof uuid !== 'string' || !this.isValidUUIDv7(uuid)) {
            throw new BadRequestException(errorMessage ?? 'Invalid UUID')
        }
    }

    public static paginationToFlatPaginationConverter<T>(pagination: Pagination<T>): FlatPagination<T> {
        const { items, meta } = pagination
        const { currentPage, itemsPerPage, itemCount, totalItems, totalPages } = meta
        return {
            items,
            itemCount,
            itemsPerPage,
            currentPage,
            totalPages: totalPages ?? -1,
            totalItems: totalItems ?? -1
        }
    }

    public static arrayEqualsIgnoreDuplicatesAndSorting<T>(a: T[], b: T[]): boolean {
        const aAsSet = new Set<T>(a)
        const bAsSet = new Set<T>(b)
        if (aAsSet.size !== bAsSet.size) {
            return false
        }
        for (const x of aAsSet) {
            if (!bAsSet.has(x)) {
                return false
            }
        }
        return true
    }

}

