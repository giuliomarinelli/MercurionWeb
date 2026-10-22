import { SetMetadata } from '@nestjs/common'
import type { FeatureName } from './feature-flags'

export const REQUIRED_FEATURES_METADATA = 'mercurion:required_features'

/**
 * Class-level requirements cover every Query/Mutation or REST handler.
 * Method-level requirements are cumulative (notebook + synthesis links).
 */
export const RequiresFeatures = (...features: FeatureName[]) =>
  SetMetadata(REQUIRED_FEATURES_METADATA, features)
