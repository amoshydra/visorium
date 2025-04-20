#!/usr/bin/env node

if (process.env.NODE_ENV === `development`) {
  await import("./cli.ts.js");
} else {
  await import("../lib/cli/index.js");
}
