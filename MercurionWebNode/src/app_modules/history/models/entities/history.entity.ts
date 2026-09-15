import { UUID } from "crypto";
import { BeforeInsert, Column, Entity, PrimaryColumn } from "typeorm";
import { HistoryItemEntity } from "../enums/history-item-entity.enum";
import { uuidv7 } from "@kripod/uuidv7";

@Entity({ name: 'history' })
export class History {

    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Column()
    itemEntity: HistoryItemEntity

    @Column({ type: 'bigint' })
    touchedAt: number

    @Column({ type: 'uuid' })
    itemId: UUID

    @Column({ type: 'uuid' })
    userId: UUID

    @Column({ type: 'text' })
    flagIds: string

    @BeforeInsert()
    private beforeInsert(): void {
        this.id = uuidv7() as UUID
    }

}