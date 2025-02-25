import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../Models/entities/user.entity';
import { Repository } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { UUID } from 'crypto';

@Injectable()
export class UserService {

    constructor(@InjectRepository(User) private userRepository: Repository<User>) { }

    public generateScopeArray(rawScopes: string, mode: 'JSON' | 'JWT'): string[] | never {

        switch (mode) {
            case 'JSON':
                try {
                    return JSON.parse(rawScopes) || []
                } catch {
                    throw new RpcException('GenerateScopeArrayJson')
                }
            case 'JWT':
                {
                    if (!/^\s*$|^(\w+( \w+)*)$/.test(rawScopes)) {
                        throw new RpcException('GenerateScopeArrayJWTMalformed')
                    }
                    const scopes = rawScopes.split(/\s/)
                    return scopes.length > 0 ? scopes : []
                }

        }
    }

    public async getUserScopesById(userId: UUID): Promise<string[] | null> | never {
        const user = await this.userRepository
            .createQueryBuilder("user")
            .select(["user.scopes"])
            .where("user.id = :userId", { userId })
            .getOne();

        if (!user) {
            return null
        }

        return JSON.parse(user.scopes) as string[] ?? []

    }

}
