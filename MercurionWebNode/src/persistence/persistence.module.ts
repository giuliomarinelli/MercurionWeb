import { Global, Module } from '@nestjs/common'

import { UnitOfWork } from './transaction-context'

@Global()
@Module({
  providers: [UnitOfWork],
  exports: [UnitOfWork]
})
export class PersistenceModule {}
