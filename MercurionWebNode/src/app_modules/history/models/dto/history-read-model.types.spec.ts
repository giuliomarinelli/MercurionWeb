import {
    HistoryCollectionNameProjection,
    HistoryItemNameProjection,
    HistoryQueryProjection,
} from './history-read-model.types'

describe('History read-model projections', () => {
    it('keeps query rows independent from persistence entities', () => {
        const row: HistoryQueryProjection = {
            id: 'history-id',
            itemEntity: 'molecule_collection_items',
            touchedAt: '1700000000000',
            itemId: 'item-id',
            flagIds: '{}',
        }

        expect(row).toEqual({
            id: 'history-id',
            itemEntity: 'molecule_collection_items',
            touchedAt: '1700000000000',
            itemId: 'item-id',
            flagIds: '{}',
        })
    })

    it('models set-wise resource-name query rows', () => {
        const collection: HistoryCollectionNameProjection = {
            id: 'collection-id',
            name: 'Collection',
        }
        const item: HistoryItemNameProjection = {
            id: 'item-id',
            type: 'chembl',
            name: null,
            chemblMolregno: '123',
        }

        expect(collection.name).toBe('Collection')
        expect(item.chemblMolregno).toBe('123')
    })
})
