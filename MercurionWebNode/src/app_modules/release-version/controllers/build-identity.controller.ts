import { Controller, Get } from '@nestjs/common'
import type { BuildIdentityDTO } from '@mercurion/rest-contracts'
import { Public } from 'src/metadata/metadata'
import { buildIdentity } from 'src/generated/build-identity'

@Controller('version')
export class BuildIdentityController {
  @Get()
  @Public()
  getBuildIdentity(): BuildIdentityDTO {
    return buildIdentity
  }
}
