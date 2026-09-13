import { ProfileDTO } from '../../../Models/account/account.models';
import {
  ActivityPointViewModel,
  DashboardMetricsViewModel,
  WorkspaceCompositionViewModel
} from './dashboard-widget.models';

export function toMetricsViewModel(profile: ProfileDTO): DashboardMetricsViewModel {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    initials: profile.firstName.slice(0, 1) + profile.lastName.slice(0, 1),
    ending: profile.gender === 'F' ? 'a' : 'o',
    totalMolecules: profile.personalMoleculeCount + profile.chemblMoleculeCount,
    personalMolecules: profile.personalMoleculeCount,
    chemblMolecules: profile.chemblMoleculeCount,
    collections: profile.collectionCount
  };
}

export function toWorkspaceCompositionViewModel(
  profile: ProfileDTO
): WorkspaceCompositionViewModel {
  return {
    labels: ['Molecole personali', 'Molecole ChEMBL', 'Collezioni'],
    values: [
      profile.personalMoleculeCount,
      profile.chemblMoleculeCount,
      profile.collectionCount
    ]
  };
}

export function toActivityViewModel(
  profile: ProfileDTO,
  days = 7,
  now = new Date()
): ActivityPointViewModel[] {
  const buckets = new Map<string, { molecules: number; collections: number }>();

  for (const item of profile.recentHistory ?? []) {
    const timestamp = Number(item.touchedAt);
    if (Number.isNaN(timestamp)) continue;

    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString().slice(0, 10);
    const bucket = buckets.get(key) ?? { molecules: 0, collections: 0 };

    if (item.itemEntity === 'molecule_collection_items') bucket.molecules++;
    if (item.itemEntity === 'molecule_collections') bucket.collections++;
    buckets.set(key, bucket);
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);
    const bucket = buckets.get(key) ?? { molecules: 0, collections: 0 };

    return {
      dayLabel: date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
      molecules: bucket.molecules,
      collections: bucket.collections
    };
  });
}
