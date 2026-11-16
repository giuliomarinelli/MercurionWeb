import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { Environment } from 'src/config/config.schema'
import { REQUIRED_FEATURES_METADATA } from './feature-access.decorator'
import { isFeatureEnabled, type FeatureName } from './feature-flags'

/**
 * Global guard installed AFTER authentication APP_GUARD.
 * Routes without feature metadata incur no configuration lookup.
 * No domain service, multipart parser, or storage operation is reached
 * when the feature is disabled.
 */
@Injectable()
export class FeatureAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndMerge<FeatureName[]>(
      REQUIRED_FEATURES_METADATA,
      [context.getClass(), context.getHandler()]
    )

    if (!required?.length) return true

    const environment = this.configService.getOrThrow<Environment>('App.env')
    if (required.some(feature => !isFeatureEnabled(environment, feature))) {
      throw new ForbiddenException('FEATURE_DISABLED')
    }
    return true
  }
}
