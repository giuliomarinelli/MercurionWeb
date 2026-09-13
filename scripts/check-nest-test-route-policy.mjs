import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('MercurionWebNode/src');
const productionModule = fs.readFileSync(path.join(root, 'app.module.ts'), 'utf8');
const testComposition = fs.readFileSync(
  path.join(root, 'test-utils', 'test-application.module.ts'),
  'utf8',
);

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(file);
    return file.endsWith('.module.ts') && !file.includes(`${path.sep}test-utils${path.sep}`)
      ? [file]
      : [];
  });
}

const leakingModules = filesIn(root).filter((file) => {
  const source = fs.readFileSync(file, 'utf8');
  return source.includes('TestController')
    || source.includes('test.controller');
});

if (leakingModules.length > 0) {
  console.error(
    `Production Nest modules must not import or register test-only controllers: ${
      leakingModules.map((file) => path.relative(process.cwd(), file)).join(', ')
    }`,
  );
  process.exit(1);
}

if (
  !testComposition.includes("import { TestController } from '../test.controller';")
  || !/controllers\s*:\s*\[[^\]]*\bTestController\b/.test(testComposition)
  || !testComposition.includes('AppModule')
) {
  console.error('TestController must be registered by the explicit test application composition.');
  process.exit(1);
}

console.log('Nest test-only route composition policy passed.');
