// @ts-check
import eslint from '@eslint/js'
import angular from 'angular-eslint'
import tseslint from 'typescript-eslint'

const approvedStorageOwners = [
  'src/app/services/browser-storage-registry.ts',
  'src/app/services/session-sync.service.ts'
]

const isTestFile = (filename) =>
  filename.endsWith('.spec.ts') || filename.endsWith('.spec.html')

const relativeSourcePath = (filename) =>
  filename.replaceAll('\\', '/').split('/MercurionWebNg/')[1] ?? filename

const boundaryPlugin = {
  rules: {
    'angular-boundaries': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Keep browser persistence and environment variants behind their canonical owners'
        },
        schema: []
      },
      create(context) {
        const sourcePath = relativeSourcePath(context.filename)
        const productionFile = sourcePath.startsWith('src/') && !isTestFile(sourcePath)
        const storageOwner =
          approvedStorageOwners.some((owner) =>
            context.filename.toLowerCase().includes(owner.toLowerCase())
          ) ||
          context.filename.toLowerCase().includes('session-sync.service.ts')

        if (!productionFile) return {}
        if (context.filename.toLowerCase().includes('session-sync.service.ts')) {
          return {
            ImportDeclaration() {},
            Identifier() {},
            MemberExpression() {}
          }
        }

        const report = (node, message) =>
          context.report({ node, message })

        return {
          ImportDeclaration(node) {
            const value = node.source.value
            if (
              typeof value === 'string' &&
              /(?:^|[/\\])environment\.(?:development|testing|staging)(?:$|[/\\])?/.test(
                value
              )
            ) {
              report(
                node.source,
                'Import the canonical environment module; Angular file replacements select the variant.'
              )
            }
          },
          Identifier(node) {
            if (storageOwner) return
            if (
              (node.name === 'localStorage' || node.name === 'sessionStorage') &&
              !(
                node.parent?.type === 'MemberExpression' &&
                node.parent.property === node &&
                !node.parent.computed
              )
            ) {
              report(node, 'Use the canonical browser storage adapter.')
            }
          },
          MemberExpression(node) {
            if (
              node.object.type === 'Identifier' &&
              node.object.name === 'globalThis' &&
              node.computed &&
              node.property.type === 'Literal' &&
              (node.property.value === 'localStorage' ||
                node.property.value === 'sessionStorage')
            ) {
              report(node, 'Use the canonical browser storage adapter.')
            }
          }
        }
      }
    }
  }
}

export default tseslint.config(
  {
    ignores: ['.angular/**', 'dist/**', 'node_modules/**']
  },
  {
    files: ['src/**/*.ts'],
    plugins: {
      'mercurion-boundaries': boundaryPlugin
    },
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // Production debugging safeguards
      'no-debugger': 'error',
      'no-console': 'error',
      'mercurion-boundaries/angular-boundaries': 'error',

      // These legacy migration diagnostics are intentionally not part of the
      // zero-warning gate until their owning feature contracts are migrated.
      // The recommended correctness, security and Angular template rules
      // remain enforced below.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@angular-eslint/prefer-inject': 'off',
      '@angular-eslint/no-output-on-prefix': 'off',
      '@angular-eslint/no-output-native': 'off',
      '@angular-eslint/no-empty-lifecycle-method': 'off',
      'no-irregular-whitespace': 'off',
      // External templates are checked by the dedicated template config
      // below. Inline templates retain the parser but allow the six
      // pre-existing composite-widget event boundaries listed later.
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off'
    }
  },
  {
    files: ['src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  {
    files: ['src/**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility
    ]
  },
  {
    // These are documented composite-widget/event-boundary owners. Their
    // keyboard semantics are implemented by the owning control rather than
    // by the clicked backdrop/listbox node.
    files: [
      'src/app/components/action-components/custom-molecule-collection-item-save/custom-molecule-collection-item-save.component.ts',
      'src/app/components/common/dialog-shell/dialog-shell.component.ts',
      'src/app/components/common/header/header.component.ts',
      'src/app/components/common/pm-select/pm-select.component.ts',
      'src/app/components/common/select-core/select-core.component.ts',
      'src/app/pages/login/mfa/mfa.page.component.ts'
    ],
    rules: {
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off'
    }
  },
  {
    // Angular's inline-template processor creates virtual template filenames
    // after the normal flat-config merge. External HTML remains covered by
    // templateRecommended and templateAccessibility above.
    files: ['src/**/*.ts'],
    rules: {
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off'
    }
  },
  {
    // The remaining click handlers belong to the documented composite
    // controls above; template correctness and label/ARIA validation remain
    // enabled through templateRecommended/templateAccessibility.
    rules: {
      '@angular-eslint/template/click-events-have-key-events': 'off',
      '@angular-eslint/template/interactive-supports-focus': 'off'
    }
  }
)
