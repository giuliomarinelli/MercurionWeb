import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export enum ReleaseContext {
    BETA = 'beta',
    PROD = 'prod',
}

@Entity({ name: 'release_versions' })
@Index('ux_release_versions_version_string', ['versionString'], { unique: true })
@Index('ux_release_versions_source_ref', ['sourceRef'], { unique: true })
@Index('ux_release_versions_components', ['context', 'major', 'minor', 'patch', 'betaIteration'], { unique: true })
export class ReleaseVersion {
    /**
     * UUID v7 generato lato app (o comunque UUID generato fuori dal DB).
     */
    @PrimaryColumn('uuid')
    id!: string

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date

    @Column({
        type: 'enum',
        enum: ReleaseContext,
        enumName: 'release_context', // usa lo stesso nome dell'enum in PG
    })
    context!: ReleaseContext

    @Column({ type: 'int' })
    major!: number

    @Column({ type: 'int' })
    minor!: number

    /**
     * Solo per PROD. In BETA deve essere null.
     */
    @Column({ type: 'int', nullable: true })
    patch!: number | null

    /**
     * Solo per BETA. In PROD deve essere null.
     */
    @Column({ name: 'beta_iteration', type: 'int', nullable: true })
    betaIteration!: number | null

    @Column({ name: 'version_string', type: 'varchar', length: 64 })
    versionString!: string

    /**
     * sha256(source_ref) calcolato lato app, prima dell'insert.
     */
    @Column({ name: 'version_sha256', type: 'char', length: 64 })
    versionSha256!: string

    /**
     * Pattern: "<commitId>@<tagName>" (es: "a1b2c3d@1.7.0-beta-4")
     */
    @Column({ name: 'source_ref', type: 'varchar', length: 128 })
    sourceRef!: string

    @Column({ name: 'release_notes', type: 'jsonb', nullable: true })
    releaseNotes!: Record<string, unknown> | null

}
