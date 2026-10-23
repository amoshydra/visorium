import assert from "node:assert/strict";
import test from "node:test";
import type {
  FileServerStatus,
  FileServerStatusEvent,
} from "../src/client/hooks/useFileServerSocket.types.js";
import { nextFileServerStatus } from "../src/client/lib/server-status.js";

const cases: Array<[FileServerStatus, FileServerStatusEvent, FileServerStatus]> =
  [
    ["connecting", "connect", "loading"],
    ["connecting", "pending", "loading"],
    ["connecting", "initial", "ready"],
    ["loading", "initial", "ready"],
    ["loading", "disconnect", "reconnecting"],
    ["ready", "pending", "loading"],
    ["ready", "initial", "ready"],
    ["ready", "disconnect", "reconnecting"],
    ["reconnecting", "connect", "loading"],
    ["reconnecting", "initial", "ready"],
    ["error", "retry", "connecting"],
    ["error", "connect", "loading"],
    ["connecting", "disconnect", "connecting"],
    ["ready", "error", "error"],
    ["loading", "error", "error"],
  ];

for (const [current, event, expected] of cases) {
  test(`${current} + ${event} -> ${expected}`, () => {
    assert.equal(nextFileServerStatus(current, event), expected);
  });
}
