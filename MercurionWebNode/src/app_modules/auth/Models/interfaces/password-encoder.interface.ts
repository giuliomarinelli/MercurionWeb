export interface PasswordEncoder {

    encode(password: string): Promise<string>

    compare(password: string, hashedPassword: string): Promise<boolean>

}