import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
    name: 'toxicity_view',
    synchronize: false,
})
export class ToxicityViewEntity {

    @ViewColumn()
    id: number

    @ViewColumn({ name: 'warning_type' })
    warningType: string

    @ViewColumn({ name: 'warning_description' })
    warningDescription: string

}
