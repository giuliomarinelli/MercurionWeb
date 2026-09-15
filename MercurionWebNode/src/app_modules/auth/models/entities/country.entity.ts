import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'countries' })
export class Country {

  @PrimaryColumn()
  id: number

  @Column({ type: 'varchar', length: 100 })
  name: string

  @Column({ type: 'char', length: 2, nullable: true })
  iso2: string | null

  @Column({ type: 'varchar', length: 191, nullable: true })
  emoji: string | null

  @Column({ name: 'emoji_u', type: 'varchar', length: 191, nullable: true })
  emojiU: string | null

  @Column({ type: 'numeric', precision: 10, scale: 8, nullable: true })
  latitude: string | null

  @Column({ type: 'numeric', precision: 11, scale: 8, nullable: true })
  longitude: string | null

  @Column({ type: 'varchar', length: 255, nullable: true })
  phonecode: string | null
}
