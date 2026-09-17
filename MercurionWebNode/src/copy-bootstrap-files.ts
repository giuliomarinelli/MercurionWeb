import * as fs from 'fs'
import * as path from 'path'

export function copyBootstrapFiles() {

  const keysSourcePath = path.join(process.cwd(), 'src/config/keys')
  const keysDistPath = path.join(process.cwd(), 'dist/src/config/keys')

  copyDirectory(keysSourcePath, keysDistPath)

  console.log('✅ File bootstrap copiati con successo!')

}

export function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️ La sorgente ${src} non esiste. Niente da copiare.`)
    return;
  }

  fs.cpSync(src, dest, { recursive: true })
}
