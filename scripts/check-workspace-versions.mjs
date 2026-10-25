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

if (manifest["packages/spatial"] !== version) {
  errors.push(
    `release-please manifest spatial is ${manifest["packages/spatial"]}, expected ${version}`,
  );
}

if (!config.packages?.["."]) {
  errors.push("release-please config is missing the root package");
}

if (!config.packages?.["packages/spatial"]) {
  errors.push("release-please config is missing packages/spatial");
}

const components = config.plugins?.find(
  (plugin) => plugin.type === "linked-versions",
)?.components;

for (const component of ["visorium", "visorium-spatial"]) {
  if (!components?.includes(component)) {
    errors.push(`linked-versions is missing ${component}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`version check: ${error}`);
  }
  process.exit(1);
}

console.log(`Workspace versions aligned at ${version}.`);
