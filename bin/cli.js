#!/usr/bin/env node

if (process.env.VISORIUM_DEV === `1`) {
  await import("./cli.ts.js");
} else {
  await import("../dist/cli.js");
}
