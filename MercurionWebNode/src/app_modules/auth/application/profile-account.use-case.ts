import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { UserService } from 'src/app_modules/user/services/user.service';
import { ProfileDTO, ProfileRegistryClientDTO, ProfileRegistryDTO } from '../models/dto/profile.dtos';

@Injectable()
export class ProfileAccountUseCase {
  constructor(private readonly users: UserService) {}

  async getProfile(userId: UUID, includeRecentHistory: boolean): Promise<ProfileDTO | null> {
    const result = await this.users.getVerifiedUserProfileById(userId, includeRecentHistory);
    return result;
  }

  getEssentialProfile(userId: UUID): Promise<ProfileRegistryClientDTO> {
    return this.users.getVerifiedUserEssentialProfileRegistryById(userId);
  }

  async updateProfile(userId: UUID, input: ProfileRegistryDTO): Promise<ProfileRegistryClientDTO | null> {
    const result = await this.users.updateVerifiedUserProfileRegistryById(userId, input);
    return result;
  }
}
