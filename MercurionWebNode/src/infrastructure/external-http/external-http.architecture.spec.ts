import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

describe('external HTTP architecture', () => {
    it('keeps Axios imports inside the external HTTP adapter', () => {
        const governedRoots = [
            join(__dirname, '../../app_modules/oauth2-client'),
            join(__dirname, '../../app_modules/sso'),
        ]
        const violations: string[] = []

        for (const root of governedRoots) {
            walk(root).forEach(file => {
                const source = readFileSync(file, 'utf8')
                if (/\b(?:import|require)\s*(?:[^;]*?\sfrom\s*)?['"]axios['"]/.test(source)) {
                    violations.push(file)
                }
            })
        }

        expect(violations).toEqual([])
    })
})

function walk(directory: string): string[] {
    return readdirSync(directory).flatMap(entry => {
        const file = join(directory, entry)
        return statSync(file).isDirectory()
            ? walk(file)
            : file.endsWith('.ts') && !file.endsWith('.spec.ts') ? [file] : []
    })
}
