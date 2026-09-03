import 'reflect-metadata'

import { NestFactory } from '@nestjs/core'
import {
  GRAPHQL_SDL_FILE_HEADER,
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
  RESOLVER_TYPE_METADATA,
} from '@nestjs/graphql'
import {
  buildSchema,
  lexicographicSortSchema,
  printSchema,
  type GraphQLSchema,
} from 'graphql'
import {
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { relative, resolve } from 'node:path'

const nodeRoot = process.cwd()
const sourceRoot = resolve(nodeRoot, 'src')
const schemaPath = resolve(sourceRoot, 'schema.graphql')
const updateFlag = '--update'

function discoverResolverFiles(directory: string): string[] {
  return readdirSync(directory)
    .sort()
    .flatMap((entry) => {
      const entryPath = resolve(directory, entry)

      if (statSync(entryPath).isDirectory()) {
        return discoverResolverFiles(entryPath)
      }

      return entry.endsWith('.resolver.ts') && !entry.endsWith('.resolver.spec.ts')
        ? [entryPath]
        : []
    })
}

function discoverResolverClasses(): Function[] {
  const resolverClasses = discoverResolverFiles(sourceRoot).flatMap((resolverFile) => {
    // The command runs through ts-node with tsconfig-paths, so loading source
    // files registers the same decorator metadata used by the Nest runtime.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const resolverModule = require(resolverFile) as Record<string, unknown>

    return Object.values(resolverModule).filter(
      (exportedValue): exportedValue is Function =>
        typeof exportedValue === 'function' &&
        Reflect.hasMetadata(RESOLVER_TYPE_METADATA, exportedValue),
    )
  })

  if (resolverClasses.length === 0) {
    throw new Error(`No Nest GraphQL resolvers were discovered under ${sourceRoot}`)
  }

  return resolverClasses
}

async function generateSchema(): Promise<GraphQLSchema> {
  const application = await NestFactory.createApplicationContext(
    GraphQLSchemaBuilderModule,
    { logger: false },
  )

  try {
    const schemaFactory = application.get(GraphQLSchemaFactory)
    return await schemaFactory.create(discoverResolverClasses())
  } finally {
    await application.close()
  }
}

function renderSchema(schema: GraphQLSchema): string {
  return `${GRAPHQL_SDL_FILE_HEADER}${printSchema(lexicographicSortSchema(schema))}\n`
}

function semanticForm(schemaSource: string): string {
  return `${printSchema(lexicographicSortSchema(buildSchema(schemaSource)))}\n`
}

function printFirstDifference(committed: string, generated: string): void {
  const committedLines = committed.replace(/\r\n/g, '\n').split('\n')
  const generatedLines = generated.replace(/\r\n/g, '\n').split('\n')
  const maximumLength = Math.max(committedLines.length, generatedLines.length)
  let differenceIndex = 0

  while (
    differenceIndex < maximumLength &&
    committedLines[differenceIndex] === generatedLines[differenceIndex]
  ) {
    differenceIndex += 1
  }

  const firstLine = Math.max(0, differenceIndex - 2)
  const finalLine = Math.min(maximumLength, differenceIndex + 3)

  console.error(`First differing hunk near line ${differenceIndex + 1}:`)
  for (let index = firstLine; index < finalLine; index += 1) {
    const lineNumber = String(index + 1).padStart(5, ' ')
    const committedLine = committedLines[index]
    const generatedLine = generatedLines[index]

    if (committedLine === generatedLine) {
      console.error(`  ${lineNumber} ${committedLine ?? ''}`)
      continue
    }

    if (committedLine !== undefined) {
      console.error(`- ${lineNumber} ${committedLine}`)
    }
    if (generatedLine !== undefined) {
      console.error(`+ ${lineNumber} ${generatedLine}`)
    }
  }
}

async function main(): Promise<void> {
  const unexpectedArguments = process.argv
    .slice(2)
    .filter((argument) => argument !== updateFlag)

  if (unexpectedArguments.length > 0) {
    throw new Error(`Unknown argument(s): ${unexpectedArguments.join(', ')}`)
  }

  const renderedSchema = renderSchema(await generateSchema())

  if (process.argv.includes(updateFlag)) {
    writeFileSync(schemaPath, renderedSchema, 'utf8')
    console.log(`Updated Nest GraphQL schema: ${relative(nodeRoot, schemaPath)}`)
    return
  }

  const committedSchema = readFileSync(schemaPath, 'utf8')
  if (Buffer.from(committedSchema).equals(Buffer.from(renderedSchema))) {
    console.log(`Nest GraphQL schema is current: ${relative(nodeRoot, schemaPath)}`)
    return
  }

  console.error(`Nest GraphQL schema drift detected: ${relative(nodeRoot, schemaPath)}`)

  try {
    const semanticDrift = semanticForm(committedSchema) !== semanticForm(renderedSchema)
    console.error(
      semanticDrift
        ? 'Drift category: semantic schema change.'
        : 'Drift category: byte-only formatting, ordering, or line-ending change.',
    )
  } catch (error) {
    console.error('Drift category: committed schema is not valid GraphQL SDL.')
    console.error(error)
  }

  printFirstDifference(committedSchema, renderedSchema)
  console.error(
    'Regenerate intentionally with: npm run graphql:schema:update --workspace mercurion_web_node',
  )
  process.exitCode = 1
}

void main().catch((error: unknown) => {
  console.error('Nest GraphQL schema generation failed.')
  console.error(error)
  process.exitCode = 1
})
