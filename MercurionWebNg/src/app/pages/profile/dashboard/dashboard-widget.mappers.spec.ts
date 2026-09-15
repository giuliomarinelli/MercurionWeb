import { ProfileDTO } from '../../../Models/account/account.models';
import {
  toActivityViewModel,
  toMetricsViewModel,
  toWorkspaceCompositionViewModel
} from './dashboard-widget.mappers';

const profile = (overrides: Partial<ProfileDTO> = {}): ProfileDTO => ({
  firstName: 'Ada',
  lastName: 'Lovelace',
  gender: 'F',
  personalMoleculeCount: 2,
  chemblMoleculeCount: 3,
  collectionCount: 4,
  recentHistory: [],
  ...overrides
} as ProfileDTO);

describe('dashboard widget mappers', () => {
  it('maps profile metrics without leaving arithmetic in the page shell', () => {
    expect(toMetricsViewModel(profile())).toEqual(jasmine.objectContaining({
      initials: 'AL',
      ending: 'a',
      totalMolecules: 5,
      collections: 4
    }));
  });

  it('keeps composition labels and values stable', () => {
    expect(toWorkspaceCompositionViewModel(profile())).toEqual({
      labels: ['Molecole personali', 'Molecole ChEMBL', 'Collezioni'],
      values: [2, 3, 4]
    });
  });

  it('buckets recent activity deterministically and ignores invalid timestamps', () => {
    const now = new Date('2026-09-12T12:00:00.000Z');
    const result = toActivityViewModel(profile({
      recentHistory: [
        { id: '1', itemId: 'm1', itemEntity: 'molecule_collection_items', touchedAt: now.getTime() },
        { id: '2', itemId: 'c1', itemEntity: 'molecule_collections', touchedAt: now.getTime() },
        { id: '3', itemId: 'c2', itemEntity: 'molecule_collections', touchedAt: Number.NaN }
      ]
    }), 1, now);

    expect(result).toEqual([jasmine.objectContaining({
      molecules: 1,
      collections: 1
    })]);
  });
});
