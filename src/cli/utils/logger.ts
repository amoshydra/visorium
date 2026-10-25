import chalk from "chalk";

const ACTIVITY_INTERVAL_MS = 300;
const DEFAULT_TERMINAL_WIDTH = 120;

interface Activity {
  phase: "scanning" | "ready";
  added: number;
  changed: number;
  removed: number;
  errors: number;
  lastFile?: string;
  lastError?: string;
  dirty: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

let activity: Activity | null = null;
let statusLineActive = false;
const warned = new Set<string>();
const isTty = Boolean(process.stdout.isTTY);

const sanitizeLine = (value: string) =>
  Array.from(value, (character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 0x20 || code === 0x7f ? " " : character;
  }).join("");

const truncate = (value: string, maxLength: number) => {
  const singleLine = sanitizeLine(value);
  return singleLine.length > maxLength
    ? `${singleLine.slice(0, Math.max(0, maxLength - 1))}…`
    : singleLine;
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const clearStatusLine = () => {
  if (!statusLineActive) return;
  process.stdout.write("\r\x1b[K");
  statusLineActive = false;
};

const getActivity = (): Activity => {
  if (!activity) {
    activity = {
      phase: "scanning",
      added: 0,
      changed: 0,
      removed: 0,
      errors: 0,
      dirty: false,
    };
  }
  return activity;
};

const formatActivity = (current: Activity) => {
  const prefix = current.phase === "scanning" ? "Scanning" : "Watching";
  const parts: string[] = [];

  if (current.added > 0) parts.push(`+${current.added}`);
  if (current.changed > 0) parts.push(`~${current.changed}`);
  if (current.removed > 0) parts.push(`-${current.removed}`);
  if (current.errors > 0) parts.push(`errors:${current.errors}`);
  if (current.lastFile) parts.push(current.lastFile);

  const width = Math.max(
    40,
    (process.stdout.columns || DEFAULT_TERMINAL_WIDTH) - 1,
  );
  return truncate(`${prefix} ${parts.join(" ")}`, width);
};

const flushActivity = () => {
  if (!activity) return;
  if (activity.timer) {
    clearTimeout(activity.timer);
    activity.timer = undefined;
  }
  if (!activity.dirty) return;

  const line = formatActivity(activity);
  if (isTty) {
    process.stdout.write(`\r${chalk.gray(line)}\x1b[K`);
    statusLineActive = true;
  } else {
    console.log(chalk.gray(line));
  }

  activity.added = 0;
  activity.changed = 0;
  activity.removed = 0;
  activity.dirty = false;
};

const scheduleActivity = () => {
  const current = getActivity();
  current.dirty = true;
  if (current.timer) return;

  current.timer = setTimeout(() => {
    current.timer = undefined;
    flushActivity();
  }, ACTIVITY_INTERVAL_MS);
  current.timer.unref?.();
};

const writeImmediate = (
  method: "log" | "warn" | "error",
  message: string,
  error?: unknown,
) => {
  clearStatusLine();
  if (method === "log") {
    console.log(message);
  } else if (method === "warn") {
    console.warn(message);
  } else {
    console.error(message);
  }
  if (error !== undefined) {
    console.error(error);
  }
};

export const logger = {
  info: (message: string) => writeImmediate("log", chalk.blue(message)),
  success: (message: string) => writeImmediate("log", chalk.green(message)),
  warn: (message: string, error?: unknown) =>
    writeImmediate("warn", chalk.yellow(message), error),
  error: (message: string, error?: unknown) =>
    writeImmediate("error", chalk.red(message), error),

  fileAdded: (path: string) => {
    const current = getActivity();
    current.added += 1;
    current.lastFile = path;
    scheduleActivity();
  },

  fileChanged: (path: string) => {
    const current = getActivity();
    current.changed += 1;
    current.lastFile = path;
    scheduleActivity();
  },

  fileRemoved: (path: string) => {
    const current = getActivity();
    current.removed += 1;
    current.lastFile = path;
    scheduleActivity();
  },

  probeError: (path: string, error: unknown) => {
    const current = getActivity();
    current.errors += 1;
    current.lastFile = path;
    current.lastError = errorMessage(error);
    scheduleActivity();
  },

  activityReady: (totalFiles: number, elapsedMs: number) => {
    const current = activity;
    if (current?.timer) {
      clearTimeout(current.timer);
      current.timer = undefined;
    }
    clearStatusLine();

    if (current && current.errors > 0) {
      const last = current.lastError
        ? ` (last: ${truncate(current.lastError, 96)})`
        : "";
      console.warn(
        chalk.yellow(`Media probe warnings: ${current.errors}${last}`),
      );
    }

    const elapsed = `${(elapsedMs / 1000).toFixed(1)}s`;
    console.log(chalk.blue(`Indexed ${totalFiles} media files in ${elapsed}.`));

    activity = {
      phase: "ready",
      added: 0,
      changed: 0,
      removed: 0,
      errors: 0,
      dirty: false,
    };
  },

  warnOnce: (key: string, message: string) => {
    if (warned.has(key)) return;
    warned.add(key);
    writeImmediate("warn", chalk.yellow(message));
  },
};
