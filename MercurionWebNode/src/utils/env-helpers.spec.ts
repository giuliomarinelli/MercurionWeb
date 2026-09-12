import { readFileSync } from 'fs'
import { join } from 'path'

import { Environment } from 'src/config/config.schema'
import { ConfigurationError } from 'src/config/env-validation'
import {
    parseAppEnv,
    shouldUseEnvFile
} from './env-helpers'

const supportedEnvironments = Object.values(Environment)
const invalidEnvironments = [
    'prodution',
    'DEV',
    ' development',
    'development ',
    'preview',
    ''
]

function deploymentEnvironmentValues(contents: string): string[] {
    const dockerValues = [...contents.matchAll(
        /^\s*ENV\s+APP_ENV=(\S+)\s*$/gm
    )].map(match => match[1])
    const kubernetesValues = [...contents.matchAll(
        /^\s*-\s+name:\s*APP_ENV\s*\r?\n\s*value:\s*["']?([^"'\s]+)["']?\s*$/gm
    )].map(match => match[1])

    return [...dockerValues, ...kubernetesValues]
}

describe('application environment resolution', () => {
    it.each(supportedEnvironments)(
        'accepts the supported %s environment',
        environment => {
            expect(parseAppEnv(environment)).toBe(environment)
        }
    )

    it.each(invalidEnvironments)(
        'rejects the provided invalid environment %j',
        environment => {
            expect(() => parseAppEnv(environment)).toThrow(ConfigurationError)

            try {
                parseAppEnv(environment)
                throw new Error('Expected APP_ENV parsing to fail')
            } catch (error) {
                expect((error as ConfigurationError).diagnostics).toEqual([{
                    source: 'APP_ENV',
                    message: 'must be one of: development, staging, production, test'
                }])
            }
        }
    )

    it('preserves the schema-declared default only for a missing value', () => {
        expect(parseAppEnv(undefined)).toBe(Environment.Development)
        expect(() => parseAppEnv('')).toThrow(ConfigurationError)
    })

    it('selects env files only from validated development and test values', () => {
        expect(shouldUseEnvFile(parseAppEnv(Environment.Development))).toBe(true)
        expect(shouldUseEnvFile(parseAppEnv(Environment.Test))).toBe(true)
        expect(shouldUseEnvFile(parseAppEnv(Environment.Staging))).toBe(false)
        expect(shouldUseEnvFile(parseAppEnv(Environment.Production))).toBe(false)
        expect(() => shouldUseEnvFile(parseAppEnv('prodution'))).toThrow(ConfigurationError)
    })

    it.each([
        'Dockerfile',
        'Dockerfile.staging',
        'Dockerfile.test',
        '../k8s/beta/mercurion-web-node-deploy.yaml',
        '../k8s/beta/mercurion-web-ng-deploy.yaml'
    ])('uses supported APP_ENV values in %s', relativePath => {
        const values = deploymentEnvironmentValues(
            readFileSync(join(process.cwd(), relativePath), 'utf8')
        )

        expect(values.length).toBeGreaterThan(0)
        expect(values.map(parseAppEnv)).toEqual(
            expect.arrayContaining(values)
        )
    })

    it.each([
        'ENV APP_ENV=prodution',
        '- name: APP_ENV\n  value: "preview"'
    ])('rejects an unsupported deployment fixture', fixture => {
        const values = deploymentEnvironmentValues(fixture)

        expect(values).toHaveLength(1)
        expect(() => values.map(parseAppEnv)).toThrow(ConfigurationError)
    })
})
