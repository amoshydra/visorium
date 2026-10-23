import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { io } from "socket.io-client";
import sharp from "sharp";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");

const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const targetDir = getArg("--dir");
const count = Number.parseInt(getArg("--count") ?? "2000", 10);
const port = Number.parseInt(getArg("--port") ?? "3300", 10);
const generate = args.includes("--generate");
const keepCache = args.includes("--keep-cache");

const usage = `
Usage:
  pnpm benchmark --generate --dir /tmp/visorium-bench --count 2000
  pnpm benchmark --dir /tmp/visorium-bench

Options:
  --dir <path>     Folder to serve
  --count <n>      Fixture count for --generate (default 2000)
  --port <n>       Port for the benchmark server (default 3300)
  --generate       Create test images in --dir
  --keep-cache     Keep the temporary thumbnail cache
`;

const generateFixtures = async (dir: string, imageCount: number) => {
  await mkdir(dir, { recursive: true });

  const source = join(dir, ".benchmark-source.jpg");
  await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 180, g: 120, b: 80 },
    },
  })
    .jpeg({ quality: 70 })
    .toFile(source);

  const width = String(Math.max(4, String(imageCount).length));
  let next = 0;
  const worker = async () => {
    while (next < imageCount) {
      const index = next++;
      const name = `bench-${String(index).padStart(Number(width), "0")}.jpg`;
      await copyFile(source, join(dir, name));
    }
  };

  await Promise.all(Array.from({ length: 8 }, worker));
  await rm(source, { force: true });
};

const waitForReady = (child: ReturnType<typeof spawn>) => {
  return new Promise<void>((resolvePromise, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for the server to become ready"));
    }, 120_000);

    const onData = (chunk: Buffer) => {
      if (chunk.toString().includes("is ready")) {
        clearTimeout(timeout);
        child.stdout?.off("data", onData);
        child.stdout?.resume();
        resolvePromise();
      }
    };

    child.stdout?.on("data", onData);
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited with code ${code}`));
    });
  });
};

const measure = async (dir: string) => {
  const providedCacheDir = getArg("--cache");
  const cacheDir =
    providedCacheDir ??
    (await mkdtemp(join(tmpdir(), "visorium-benchmark-cache-")));
  const baseUrl = `http://localhost:${port}`;
  const started = Date.now();

  const server = spawn(
    process.execPath,
    [join(rootDir, "lib/cli/index.js"), "--port", String(port)],
    {
      cwd: dir,
      env: {
        ...process.env,
        NODE_ENV: "production",
        VISORIUM_CACHE_DIR: cacheDir,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  server.stderr.resume();
  await waitForReady(server);
  const readyMs = Date.now() - started;

  const socketStarted = Date.now();
  const initial = await new Promise<{
    count: number;
    bytes: number;
    entries: Array<[string, { mt: number; sz?: number }]>;
  }>((resolvePromise, reject) => {
    const socket = io(baseUrl, { transports: ["websocket"] });
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error("Timed out waiting for the initial file list"));
    }, 15_000);

    socket.on("f:i", (entries: Array<[string, { mt: number; sz?: number }]>) => {
      clearTimeout(timeout);
      socket.close();
      resolvePromise({
        count: entries.length,
        bytes: JSON.stringify(entries).length,
        entries,
      });
    });
  });
  const initialLatencyMs = Date.now() - socketStarted;

  const sample = initial.entries.slice(0, 12);
  const thumbnails: Array<{ bytes: number; ms: number }> = [];

  for (const [name, info] of sample) {
    const startedAt = Date.now();
    const response = await fetch(
      `${baseUrl}/thumb?path=${encodeURIComponent(name)}&v=${info.mt}&w=640`,
    );
    const body = await response.arrayBuffer();
    thumbnails.push({ bytes: body.byteLength, ms: Date.now() - startedAt });
  }

  const thumbBytes = thumbnails.reduce((total, item) => total + item.bytes, 0);
  const thumbTime = thumbnails.reduce((total, item) => total + item.ms, 0);

  server.kill("SIGTERM");
  if (!keepCache && !providedCacheDir) {
    await rm(cacheDir, { recursive: true, force: true });
  }

  return {
    files: initial.count,
    readyMs,
    initialPayloadBytes: initial.bytes,
    initialLatencyMs,
    sampleThumbnails: thumbnails.length,
    averageThumbnailBytes: Math.round(thumbBytes / thumbnails.length) || 0,
    averageThumbnailMs: Math.round(thumbTime / thumbnails.length) || 0,
    ...(keepCache || providedCacheDir ? { cacheDir } : {}),
  };
};

if (generate) {
  if (!targetDir) {
    console.error(usage);
    process.exit(1);
  }
  await generateFixtures(targetDir, count);
  console.log(`Generated ${count} images in ${targetDir}`);
  process.exit(0);
}

if (!targetDir) {
  console.error(usage);
  process.exit(1);
}

const result = await measure(resolve(targetDir));
console.log(JSON.stringify(result, null, 2));
