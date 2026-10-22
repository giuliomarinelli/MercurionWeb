import { validateNotebookDelta, requireNotebookTitle } from './notebook-delta'

describe('Quill Delta persistence safety', () => {
  it('derives the searchable text from full document ops', () => {
    const input = { ops: [
      { insert: 'Reaction ' },
      { insert: 'conditions', attributes: { bold: true } },
      { insert: '\n' },
      { insert: { image: 'blob:example' } },
      { insert: 'Result\n' }
    ] }
    expect(validateNotebookDelta(input)).toEqual({
      delta: input,
      sanitizedText: 'Reaction conditions\n Result\n'
    })
  })

  it('rejects incremental operations and arbitrary raw HTML envelopes', () => {
    expect(() => validateNotebookDelta({ ops: [{ retain: 1 }] })).toThrow()
    expect(() => validateNotebookDelta({ ops: [{ delete: 3 }] })).toThrow()
    expect(() => validateNotebookDelta({ html: '<script>bad</script>' })).toThrow()
  })

  it('rejects data that exceeds the configured quota', () => {
    expect(() => validateNotebookDelta({ ops: [{ insert: 'a'.repeat(1_000_001) }] })).toThrow()
  })

  it('supports clearing a draft while keeping it search-safe', () => {
    expect(validateNotebookDelta(null)).toEqual({ delta: null, sanitizedText: '' })
    expect(validateNotebookDelta({ ops: [{ insert: 'ok\u0000\u0001\n' }] }).sanitizedText)
      .toBe('ok\n')
  })

  it('normalizes titles and rejects empty ones', () => {
    expect(requireNotebookTitle('  Chemical   research  ')).toBe('Chemical research')
    expect(() => requireNotebookTitle('  ')).toThrow()
  })

  it('removes C0 controls while preserving tabs, line endings and Unicode text', () => {
    const controls = Array.from({ length: 32 }, (_, code) => String.fromCharCode(code)).join('')
    expect(validateNotebookDelta({ ops: [{ insert: `Caffè 🧪${controls}\u007f` }] }).sanitizedText)
      .toBe('Caffè 🧪\t\n\r\u007f')
  })
})
