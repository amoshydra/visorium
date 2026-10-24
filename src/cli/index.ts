import { Command } from "commander";
import { start } from "./commands/start.js";

const program = new Command();

const collect = (value: string, previous: string[]) => [...previous, value];

program
  .name("visorium")
  .description("Gallery server")
  .version("1.0.0")
  .action(start)
  .option("-p, --port <number>", "Port to run the server on", "3000")
  .option(
    "--ext <string[]>",
    "Additional extension to include",
    (value) => value.split(",").map((str) => "." + str.replace(/^\./, "")),
    [],
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
