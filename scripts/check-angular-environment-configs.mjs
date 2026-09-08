import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const angularJsonPath = path.join(repositoryRoot, "MercurionWebNg", "angular.json");
const angularJson = JSON.parse(fs.readFileSync(angularJsonPath, "utf8"));
const buildConfigurations =
  angularJson.projects.MercurionWebNg.architect.build.configurations;

const environmentFile = "src/environments/environment.ts";

assert.equal(
  angularJson.projects.MercurionWebNg.architect.build.defaultConfiguration,
  "production",
);
assert.equal(
  buildConfigurations.production.fileReplacements,
  undefined,
  "production must use src/environments/environment.ts without replacement",
);

for (const [configuration, environmentVariant] of [
  ["development", "environment.development.ts"],
  ["testing", "environment.testing.ts"],
  ["staging", "environment.staging.ts"],
]) {
  assert.deepEqual(
    buildConfigurations[configuration].fileReplacements,
    [
      {
        replace: environmentFile,
        with: `src/environments/${environmentVariant}`,
      },
    ],
    `${configuration} must replace ${environmentFile} with ${environmentVariant}`,
  );
}

console.log("Angular environment configuration mapping check passed.");
