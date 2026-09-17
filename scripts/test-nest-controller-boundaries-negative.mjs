#!/usr/bin/env node
import assert from 'node:assert/strict'
import { inspectControllerSource } from './check-nest-controller-boundaries.mjs'

const violations = inspectControllerSource(`
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { User } from 'src/app_modules/user/Models/entities/user.entity'
import { FastifyRequest } from 'fastify'

class BadController {
  constructor(@InjectRepository(User) repository: Repository<User>, dataSource: DataSource) {}
  get(@Req() request: FastifyRequest) { return request.body }
}
`, 'src/app_modules/help/controllers/bad.controller.ts')

assert(violations.some((violation) => violation.includes('TypeORM repositories or DataSource')))
assert(violations.some((violation) => violation.includes('persistence entities or repositories')))
assert(violations.some((violation) => violation.includes('documented transport-only boundary')))
console.log('Nest controller boundary negative test passed.')
