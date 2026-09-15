import { ProfileDTO } from '../../../Models/account/account.models';

export type DashboardWidgetStatus = 'loading' | 'error' | 'empty' | 'content';

export interface DashboardWidgetState<T> {
  status: DashboardWidgetStatus;
  value: T | null;
}

export interface DashboardMetricsViewModel {
  firstName: string;
  lastName: string;
  initials: string;
  ending: 'o' | 'a';
  totalMolecules: number;
  personalMolecules: number;
  chemblMolecules: number;
  collections: number;
}

export interface WorkspaceCompositionViewModel {
  labels: string[];
  values: number[];
}

export interface ActivityPointViewModel {
  dayLabel: string;
  molecules: number;
  collections: number;
}

export interface DashboardViewModel {
  profile: ProfileDTO;
  metrics: DashboardMetricsViewModel;
  composition: WorkspaceCompositionViewModel;
  activity: ActivityPointViewModel[];
}
