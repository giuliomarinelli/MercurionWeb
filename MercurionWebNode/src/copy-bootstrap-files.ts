import * as fs from 'fs'
import * as path from 'path'

export function copyBootstrapFiles() {

  if (process.env.NODE_ENV ?? 'development' === 'development') {

    const keysSourcePath = path.join(process.cwd(), 'src/config/keys')
    const keysDistPath = path.join(process.cwd(), 'dist/config/keys')

    const templatesSourcePath = path.join(process.cwd(), 'src/app_modules/notification/email-templates')
    const templatesDistPath = path.join(process.cwd(), 'dist/app_modules/notification/email-templates')

    copyDir(keysSourcePath, keysDistPath)
    copyDir(templatesSourcePath, templatesDistPath)

    console.log('✅ File bootstrap copiati con successo!')
  }
}

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️ La sorgente ${src} non esiste. Niente da copiare.`)
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const files = fs.readdirSync(src)
  for (const file of files) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file))
  }
}
