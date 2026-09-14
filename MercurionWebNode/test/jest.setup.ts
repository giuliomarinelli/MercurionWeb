import { buildTestEnvironment } from '../src/test-utils/configuration'

// Jest must not inherit a developer's or production configuration. The
// fixture is composed from the canonical schema and contains only safe
// examples, so configuration-backed tests are deterministic by default.
Object.assign(process.env, buildTestEnvironment({
  TWILIO_ACCOUNT_SID: 'AC00000000000000000000000000000000',
}))
