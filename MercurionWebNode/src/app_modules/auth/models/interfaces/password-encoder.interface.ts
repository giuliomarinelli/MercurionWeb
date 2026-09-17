import { CompareResult } from "../enums/compare-result.enum"

export interface PasswordEncoder {
    
    encode(password: string): Promise<string>
    compare(password: string, hashedPassword: string): Promise<boolean>
    needsRehash(hashedPassword: string): Promise<boolean>
    compareWithFallback(plainPassword: string, hashedPassword: string, allowLegacy: boolean): Promise<CompareResult>

}