import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
    name: 'activity_view',
    synchronize: false,
})
export class ActivityViewEntity {

    @ViewColumn()
    id: number

    @ViewColumn({ name: 'action_type' })
    actionType: string

    @ViewColumn({ name: 'standard_value' })
    standardValue: number

    @ViewColumn({ name: 'standard_units' })
    standardUnits: string

    @ViewColumn({ name: 'assay_description' })
    assayDescription: string

    @ViewColumn({ name: 'target_name' })
    targetName: string

    @ViewColumn({ name: 'target_organism' })
    targetOrganism: string

}
