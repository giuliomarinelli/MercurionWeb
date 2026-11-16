import { BadRequestException } from '@nestjs/common'

export interface ValidatedDelta {
  delta: Record<string, unknown> | null
  sanitizedText: string
}

/**
 * Accept a complete Quill document, not an incremental change-set.
 * Plain text is always derived server-side; no HTML supplied by the client
 * is trusted as a searchable or sanitized representation.
 */
export function validateNotebookDelta(value: unknown): ValidatedDelta {
  if (value == null) return { delta: null, sanitizedText: '' }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('NOTEBOOK_DELTA_INVALID')
  }
  const document = value as Record<string, unknown>
  if (Object.keys(document).some(key => key !== 'ops') || !Array.isArray(document.ops)) {
    throw new BadRequestException('NOTEBOOK_DELTA_INVALID')
  }
  if (document.ops.length > 5000) throw new BadRequestException('NOTEBOOK_DELTA_TOO_LARGE')

  const fragments: string[] = []
  let totalLength = 0
  for (const op of document.ops) {
    if (!op || typeof op !== 'object' || Array.isArray(op)) {
      throw new BadRequestException('NOTEBOOK_DELTA_INVALID')
    }
    const operation = op as Record<string, unknown>
    if (Object.keys(operation).some(key => key !== 'insert' && key !== 'attributes')
      || !Object.prototype.hasOwnProperty.call(operation, 'insert')) {
      throw new BadRequestException('NOTEBOOK_DELTA_INVALID')
    }
    if (operation.attributes != null &&
      (typeof operation.attributes !== 'object' || Array.isArray(operation.attributes))) {
      throw new BadRequestException('NOTEBOOK_DELTA_INVALID')
    }
    let text = ''
    if (typeof operation.insert === 'string') {
      text = operation.insert
    } else if (
      operation.insert && typeof operation.insert === 'object' &&
      !Array.isArray(operation.insert) &&
      Object.keys(operation.insert).length === 1
    ) {
      // Quill embeds are structured content, never accepted as raw HTML.
      text = ' '
    } else {
      throw new BadRequestException('NOTEBOOK_DELTA_INVALID')
    }
    totalLength += text.length
    if (totalLength > 1_000_000) throw new BadRequestException('NOTEBOOK_DELTA_TOO_LARGE')
    fragments.push(text)
  }

  return {
    delta: document,
    sanitizedText: Array.from(fragments.join(''))
      .filter(character => {
        const code = character.charCodeAt(0)
        // Retain printable text and the whitespace supported by Quill documents.
        return code >= 32 || code === 9 || code === 10 || code === 13
      })
      .join('')
  }
}

export function requireNotebookTitle(value: string): string {
  const title = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!title || title.length > 255) throw new BadRequestException('NOTEBOOK_TITLE_INVALID')
  return title
}
