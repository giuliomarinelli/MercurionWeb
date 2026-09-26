import { ThemeChoice } from '../../../Models/theme.models';
import { ProvidedAccountIdDTO } from '../../../Models/account/account.models';

export interface HeaderNavigationItem {
  readonly label: string;
  readonly url: string;
  readonly active?: boolean;
}

export interface HeaderSessionState {
  readonly loggedIn: boolean;
  readonly initials: string;
  readonly email: ProvidedAccountIdDTO | null;
}

export interface HeaderViewModel {
  readonly navigation: readonly HeaderNavigationItem[];
  readonly session: HeaderSessionState;
  readonly theme: ThemeChoice;
  readonly loginPath: boolean;
  readonly registerPath: boolean;
  readonly welcomePath: boolean;
  readonly allowedPath: boolean;
}
