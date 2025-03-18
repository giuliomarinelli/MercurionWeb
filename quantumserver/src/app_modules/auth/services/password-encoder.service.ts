import { Injectable, Logger } from '@nestjs/common';
import { PasswordEncoder } from '../Models/interfaces/password-encoder.interface';
import * as argon2 from 'argon2'
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class PasswordEncoderService implements PasswordEncoder {

    private readonly logger = new Logger(PasswordEncoderService.name)

    public async encode(password: string): Promise<string> {
        try {
            return await argon2.hash(password, {
                type: argon2.argon2id,
                timeCost: 3,
                memoryCost: 4096,
                parallelism: 1,
            })
        } catch (e) {
            const message: string = e.message as string || "Unknown error"
            this.logger.error(`Error during password encoding. Message: ${message}, StackTrace: ${e.stack || "Unknown StackTrace"}`)
            throw new RpcException('PasswordEncodingException')
        }
    }


    public async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
        try {
            return await argon2.verify(hashedPassword, plainPassword);
        } catch (e) {
            const message: string = e.message as string || "Unknown error"
            this.logger.error(`Error during password comparation. Message: ${message}, StackTrace: ${e.stack || "Unknown StackTrace"}`)
            throw new RpcException('PasswordComparingException')
        }
    }
}
