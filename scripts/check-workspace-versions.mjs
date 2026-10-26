import { readFile } from "node:fs/promises";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const root = await readJson("package.json");
const spatial = await readJson("packages/spatial/package.json");
const manifest = await readJson(".release-please-manifest.json");
const config = await readJson("release-please-config.json");

const errors = [];
const version = root.version;

if (spatial.version !== version) {
  errors.push(
    `packages/spatial is ${spatial.version}, expected ${version} from the root package`,
  );
}

if (manifest["."] !== version) {
  errors.push(
    `release-please manifest root is ${manifest["."]}, expected ${version}`,
  );
}

if (manifest["packages/spatial"] !== undefined) {
  errors.push(
    "release-please manifest should not configure packages/spatial separately",
  );
}

const rootConfig = config.packages?.["."];

if (!rootConfig) {
  errors.push("release-please config is missing the root package");
}

if (config.packages?.["packages/spatial"]) {
  errors.push(
    "release-please config should not configure packages/spatial separately",
  );
}

const extraFiles = rootConfig?.["extra-files"];
const spatialVersionFile = Array.isArray(extraFiles)
  ? extraFiles.find(
      (file) =>
        typeof file === "object" &&
        file !== null &&
        file.type === "json" &&
        file.path === "packages/spatial/package.json" &&
        file.jsonpath === "$.version",
    )
  : undefined;

if (!spatialVersionFile) {
  errors.push(
    "release-please config must update packages/spatial/package.json version",
  );
}

for (const plugin of config.plugins ?? []) {
  if (plugin.type === "linked-versions" || plugin.type === "node-workspace") {
    errors.push(`release-please should not use the ${plugin.type} plugin`);
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`version check: ${error}`);
  }
  process.exit(1);
}

console.log(`Workspace versions aligned at ${version}.`);
