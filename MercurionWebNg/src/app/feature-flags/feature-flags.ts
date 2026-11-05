import { environment } from '../../environments/environment'
import type { EnvironmentName } from '../config/app-config'

export type FeatureName = 'notebook' | 'synthesis' | 'documents'

/**
 * Beta release flags. Statically compiled into each Angular build.
 * No new environment variables or runtime configuration endpoints.
 * Keep in sync with MercurionWebNode/src/feature-flags/feature-flags.ts.
 */
export const FEATURE_FLAGS: Readonly<Record<EnvironmentName, Readonly<Record<FeatureName, boolean>>>> = {
  development: { notebook: false, synthesis: false, documents: false },
  testing: { notebook: false, synthesis: false, documents: false },
  staging: { notebook: false, synthesis: false, documents: false },
  production: { notebook: false, synthesis: false, documents: false }
}

export function isFeatureEnabled(feature: FeatureName): boolean {
  // Fail closed if the build somehow resolves an unrecognized environment.
  return FEATURE_FLAGS[environment.name]?.[feature] === true
}
