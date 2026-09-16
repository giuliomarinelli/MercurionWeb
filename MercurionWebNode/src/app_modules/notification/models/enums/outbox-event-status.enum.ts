export enum OutboxEventStatus {
  Pending = 'pending',
  Processing = 'processing',
  Succeeded = 'succeeded',
  DeadLetter = 'dead_letter',
}
