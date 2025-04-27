import { Command } from "commander";
import { start } from "./commands/start.js";

const program = new Command();

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
  );
program.parse();
