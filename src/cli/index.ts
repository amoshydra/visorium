import { readFileSync } from "node:fs";
import { Command } from "commander";
import { start } from "./commands/start.js";

const { version } = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version: string };

const program = new Command();

const collect = (value: string, previous: string[]) => [...previous, value];

program
  .name("visorium")
  .description("Gallery server")
  .version(version)
  .action(start)
  .option("-p, --port <number>", "Port to run the server on", "3000")
  .option(
    "--host <host>",
    "Host to bind to (use 0.0.0.0 for LAN/phone access)",
    "127.0.0.1",
  )
  .option(
    "--ext <string[]>",
    "Additional extension to include",
    (value) => value.split(",").map((str) => "." + str.replace(/^\./, "")),
    [],
  )
  .option(
    "--token <token>",
    "Access token for non-loopback hosts (required to access from other devices)",
  )
  .option(
    "--include-hidden",
    "Scan hidden files and folders (for example .thumbnails or .stickers)",
    false,
  )
  .option(
    "--ignore <pattern>",
    "Ignore a path or glob pattern (repeatable)",
    collect,
    [],
  );
program.parse();
