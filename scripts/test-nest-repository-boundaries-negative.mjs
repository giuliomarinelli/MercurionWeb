#!/usr/bin/env node
import assert from 'node:assert/strict'
import { inspectSource } from './check-nest-repository-boundaries.mjs'

const violations = inspectSource(`
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm'
import { User } from 'src/app_modules/user/Models/entities/user.entity'
@Injectable()
class BadService { constructor(@InjectRepository(User) repository) {} }
@Module({ exports: [TypeOrmModule] })
class BadModule {}
`, 'src/app_modules/help/bad.service.ts')

assert(violations.some((violation) => violation.includes('exports TypeOrmModule')))
assert(violations.some((violation) => violation.includes('user-owned repository User')))
console.log('Nest repository boundary negative test passed.')
