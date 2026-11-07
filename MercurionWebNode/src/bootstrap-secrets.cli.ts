import { loadSecretFileEnvironment, SecretBootstrapError } from './bootstrap/secret-file-environment'

interface SecretBootstrapDiagnostic {
  readonly code: 'INVALID_SECRET_BOOTSTRAP' | 'APPLICATION_START_FAILED'
  readonly reason: string
}

type Reporter = (diagnostic: SecretBootstrapDiagnostic) => void

async function startApplication(): Promise<void> {
  // Deliberately load application modules only after the secret document has passed validation.
  const { runBootstrap } = await import('./main')
  await runBootstrap()
}

export async function runSecretFileBootstrap(
  start: () => Promise<void> = startApplication,
  environment: NodeJS.ProcessEnv = process.env,
  report: Reporter = diagnostic => console.error('[SECRET_BOOTSTRAP_ERROR]', diagnostic)
): Promise<void> {
  try {
    loadSecretFileEnvironment(environment)
    await start()
  } catch (error) {
    report(error instanceof SecretBootstrapError
      ? { code: error.code, reason: error.reason }
      : { code: 'APPLICATION_START_FAILED', reason: 'application-startup' })
    process.exitCode = 1
  }
}

if (require.main === module) void runSecretFileBootstrap()
