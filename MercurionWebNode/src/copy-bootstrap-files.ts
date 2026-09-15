import * as fs from 'fs'
import * as path from 'path'

export function copyBootstrapFiles() {

  const keysSourcePath = path.join(process.cwd(), 'src/config/keys')
  const keysDistPath = path.join(process.cwd(), 'dist/src/config/keys')

  const templatesSourcePath = path.join(process.cwd(), 'src/app_modules/notification/email-templates')
  const templatesDistPath = path.join(process.cwd(), 'dist/src/app_modules/notification/email-templates')

  copyDirectory(keysSourcePath, keysDistPath)
  copyDirectory(templatesSourcePath, templatesDistPath)

  console.log('✅ File bootstrap copiati con successo!')

}

export function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️ La sorgente ${src} non esiste. Niente da copiare.`)
    return;
  }

  fs.cpSync(src, dest, { recursive: true })
}
