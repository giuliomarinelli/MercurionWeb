import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const appRoot = join(process.cwd(), 'MercurionWebNg');
const sourceRoot = join(appRoot, 'src');

const forbiddenSourcePatterns = [
  [/@angular\/animations\b/, 'direct @angular/animations import'],
  [/@angular\/platform-browser\/animations\b/, 'legacy browser animation import'],
  [/\bprovideAnimations\s*\(/, 'provideAnimations provider'],
  [/\bBrowserAnimationsModule\b/, 'BrowserAnimationsModule provider'],
  [/\bNoopAnimationsModule\b/, 'NoopAnimationsModule provider'],
];

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(file));
    } else if (/\.(?:ts|html|css)$/.test(entry.name)) {
      files.push(file);
    }
  }

  return files;
}

export async function collectLegacyAnimationViolations(sourceFiles, packageManifest) {
  const violations = [];

  for (const [dependency, kind] of [
    ['@angular/animations', 'direct dependency'],
    ['ngx-spinner', 'dead spinner dependency'],
  ]) {
    if (Object.hasOwn(packageManifest.dependencies ?? {}, dependency)) {
      violations.push(`MercurionWebNg/package.json: ${kind} ${dependency} is forbidden`);
    }
  }

  for (const file of sourceFiles) {
    const source = typeof file === 'string' ? await readFile(file, 'utf8') : file.source;
    const fileName = typeof file === 'string' ? file : file.file;
    for (const [pattern, description] of forbiddenSourcePatterns) {
      const match = pattern.exec(source);
      if (!match) continue;
      const line = source.slice(0, match.index).split('\n').length;
      violations.push(`${fileName}:${line} ${description} is forbidden in Angular application source`);
    }
  }

  return violations;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const packageManifest = JSON.parse(await readFile(join(appRoot, 'package.json'), 'utf8'));
  const violations = await collectLegacyAnimationViolations(await collectSourceFiles(sourceRoot), packageManifest);

  if (violations.length > 0) {
    console.error(`Legacy Angular animation dependencies or APIs detected:\n${violations.join('\n')}`);
    process.exit(1);
  }

  console.log('Angular legacy animation dependency policy passed.');
}
