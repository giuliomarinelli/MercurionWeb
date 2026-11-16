import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { copyDirectory } from './copy-bootstrap-files'

describe('copyDirectory', () => {
  let temporaryRoot: string

  beforeEach(() => {
    temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mercurion-bootstrap-copy-'))
  })

  afterEach(() => {
    fs.rmSync(temporaryRoot, { recursive: true, force: true })
  })

  it('copies nested template directories recursively', () => {
    const source = path.join(temporaryRoot, 'source')
    const destination = path.join(temporaryRoot, 'destination')
    fs.mkdirSync(path.join(source, 'layouts'), { recursive: true })
    fs.mkdirSync(path.join(source, 'partials'), { recursive: true })
    fs.writeFileSync(path.join(source, 'message.hbs'), 'message')
    fs.writeFileSync(path.join(source, 'layouts', 'shell.hbs'), 'shell')
    fs.writeFileSync(path.join(source, 'partials', 'footer.hbs'), 'footer')

    copyDirectory(source, destination)

    expect(fs.readFileSync(path.join(destination, 'message.hbs'), 'utf8')).toBe('message')
    expect(fs.readFileSync(path.join(destination, 'layouts', 'shell.hbs'), 'utf8')).toBe('shell')
    expect(fs.readFileSync(path.join(destination, 'partials', 'footer.hbs'), 'utf8')).toBe('footer')
  })
})
