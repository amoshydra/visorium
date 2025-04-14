import { Command } from "commander";
import { start } from "./commands/start.ts";

const program = new Command();

program
  .name("visorium")
  .description("Gallery server")
  .version("1.0.0")
  .action(start);
program.parse();
