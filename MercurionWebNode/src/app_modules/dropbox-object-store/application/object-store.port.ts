import type { Readable } from 'node:stream'

export interface ObjectReference {
  readonly key: string
}

export interface ObjectMetadata {
  readonly contentType: string
  readonly size: number
  readonly originalName: string
}

export interface PutObjectInput {
  readonly body: Buffer | Readable
  readonly name: string
  readonly metadata: ObjectMetadata
}

export interface PutObjectResult {
  readonly reference: ObjectReference
  readonly metadata: ObjectMetadata
}

export abstract class ObjectStore {
  abstract put(input: PutObjectInput): Promise<PutObjectResult>
  abstract get(reference: ObjectReference): Promise<Buffer>
  abstract delete(reference: ObjectReference): Promise<void>
  list?(): Promise<ReadonlyArray<ObjectReference>>
}
