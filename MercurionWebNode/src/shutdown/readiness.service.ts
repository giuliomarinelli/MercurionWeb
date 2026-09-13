import { Injectable } from '@nestjs/common'

@Injectable()
export class ReadinessService {
  private readyValue = true

  get isReady(): boolean {
    return this.readyValue
  }

  markDraining(): void {
    this.readyValue = false
  }
}
