import assert from "node:assert/strict";
import test from "node:test";
import { logger } from "../src/cli/utils/logger.js";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("throttles watcher activity into one line per interval", async (t) => {
  const lines: string[] = [];
  const warnings: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;

  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  };
  t.after(() => {
    console.log = originalLog;
    console.warn = originalWarn;
  });

  logger.fileAdded("one.jpg");
  logger.fileAdded("two.jpg");
  logger.fileChanged("three.jpg");
  logger.probeError("broken.jpg", new Error("sharp failed"));

  assert.equal(lines.length, 0);

  await wait(400);

  assert.equal(lines.length, 1);
  assert.match(lines[0]!, /Scanning/);
  assert.match(lines[0]!, /\+2/);
  assert.match(lines[0]!, /~1/);
  assert.match(lines[0]!, /errors:1/);
  assert.match(lines[0]!, /broken\.jpg/);

  logger.activityReady(3, 350);

  assert.equal(lines.length, 2);
  assert.match(lines[1]!, /Indexed 3 media files in \d\.\ds/);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0]!, /Media probe warnings: 1/);

  logger.fileRemoved("gone.jpg");

  await wait(400);

  assert.equal(lines.length, 3);
  assert.match(lines[2]!, /Watching -1 gone\.jpg/);
});
