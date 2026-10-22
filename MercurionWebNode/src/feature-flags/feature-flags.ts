import { Environment } from 'src/config/config.schema'

export type FeatureName = 'notebook' | 'synthesis' | 'documents'

/**
 * Beta release switches, compiled into the backend.
 * No .env keys, persistence, or runtime administration. All environments
 * intentionally disabled until a future, explicitly authorized release.
 */
export const FEATURE_FLAGS: Readonly<Record<Environment, Readonly<Record<FeatureName, boolean>>>> = {
  [Environment.Development]: { notebook: false, synthesis: false, documents: false },
  [Environment.Test]: { notebook: false, synthesis: false, documents: false },
  [Environment.Staging]: { notebook: false, synthesis: false, documents: false },
  [Environment.Production]: { notebook: false, synthesis: false, documents: false }
}

export function isFeatureEnabled(environment: Environment, feature: FeatureName): boolean {
  // Fail closed even if configuration unexpectedly supplies an unknown environment.
  return FEATURE_FLAGS[environment]?.[feature] === true
}
