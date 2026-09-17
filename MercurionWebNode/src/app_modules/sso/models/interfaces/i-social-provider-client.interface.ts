import { ProviderProfile } from "./provider-profile.interface";

export interface ISocialProviderClient {
  getAuthorizationUrl(state: string): string;
  getProfileFromCode(code: string): Promise<ProviderProfile>
}