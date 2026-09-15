import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const checker = path.resolve('scripts/check-nest-provider-ownership.mjs');
const sourceRoot = path.resolve('MercurionWebNode');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mercurion-provider-ownership-'));

try {
  fs.cpSync(path.join(sourceRoot, 'src'), path.join(temporaryRoot, 'src'), {
    recursive: true,
  });

  const appModule = path.join(temporaryRoot, 'src', 'app.module.ts');
  const source = fs.readFileSync(appModule, 'utf8');
  fs.writeFileSync(
    appModule,
    source.replace('providers: [', 'providers: [\n    JwtToolsService,'),
  );

  const result = spawnSync(process.execPath, [checker, `--root=${temporaryRoot}`], {
    encoding: 'utf8',
  });
  const diagnostic = `${result.stdout}\n${result.stderr}`;
  if (
    result.status === 0 ||
    !diagnostic.includes('JwtToolsService') ||
    !diagnostic.includes('src/app.module.ts')
  ) {
    console.error('Nest provider ownership checker accepted a duplicate governed provider.');
    process.exitCode = 1;
  } else {
    console.log('Nest provider ownership negative test passed.');
  }
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
