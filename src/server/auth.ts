import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { networkInterfaces } from "node:os";
import type { Request, RequestHandler, Response } from "express";

const COOKIE_NAME = "visorium_token";
const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export interface Auth {
  token: string;
  middleware: RequestHandler;
  authorizeSocket: (request: IncomingMessage) => boolean;
}

export const createToken = (): string => {
  return randomBytes(24).toString("base64url");
};

const hashToken = (value: string) => {
  return createHash("sha256").update(value).digest();
};

export const matchesToken = (
  candidate: string | null | undefined,
  expected: string,
): boolean => {
  if (!candidate) {
    return false;
  }

  return timingSafeEqual(hashToken(candidate), hashToken(expected));
};

const parseCookies = (header: string | undefined): Record<string, string> => {
  if (!header) {
    return {};
  }

  const cookies: Record<string, string> = {};

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) {
      continue;
    }

    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name) {
      continue;
    }

    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }

  return cookies;
};

const getBearerToken = (header: string | undefined): string | null => {
  if (!header?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return header.slice(7).trim() || null;
};

const getQueryToken = (url: string | undefined): string | null => {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, "http://localhost").searchParams.get("token");
  } catch {
    return null;
  }
};

const getBodyToken = (request: Request): string | null => {
  const body = request.body as unknown;

  if (typeof body !== "object" || body === null || !("token" in body)) {
    return null;
  }

  const token = (body as { token?: unknown }).token;
  return typeof token === "string" ? token : null;
};

const getRequestToken = (request: Request): string | null => {
  return (
    getBearerToken(request.headers.authorization) ??
    getQueryToken(request.originalUrl) ??
    (request.method === "POST" ? getBodyToken(request) : null) ??
    parseCookies(request.headers.cookie)[COOKIE_NAME]
  );
};

const isHtmlRequest = (request: Request): boolean => {
  return (
    request.method === "GET" &&
    (request.headers.accept ?? "").includes("text/html")
  );
};

const isSecureRequest = (request: Request): boolean => {
  return (
    request.secure ||
    request.headers["x-forwarded-proto"] === "https" ||
    request.headers["x-forwarded-proto"] === "HTTPS"
  );
};

const setAuthCookie = (
  request: Request,
  response: Response,
  token: string,
) => {
  response.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: isSecureRequest(request),
    maxAge: COOKIE_MAX_AGE_MS,
  });
};

const cleanUrl = (url: string): string => {
  try {
    const parsed = new URL(url, "http://localhost");
    parsed.searchParams.delete("token");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/";
  }
};

const loginPage = (invalid: boolean): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'self'">
  <title>Visorium</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      display: grid;
      min-height: 100vh;
      margin: 0;
      place-items: center;
      background: #0e0e0e;
      color: #ccc;
      font-family: system-ui, sans-serif;
    }
    main { width: min(100% - 2rem, 24rem); }
    h1 { margin: 0 0 0.5rem; color: #eee; font-size: 1.25rem; }
    p { color: #888; font-size: 0.875rem; line-height: 1.5; }
    p.error { color: #e06c75; }
    form { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 1.25rem; }
    input {
      width: 100%;
      min-height: 44px;
      padding: 0.6rem 0.7rem;
      border: 1px solid #333;
      border-radius: 0.45rem;
      background: #1a1a1a;
      color: #eee;
      font: inherit;
    }
    button {
      min-height: 44px;
      border: 1px solid #2f5f9f;
      border-radius: 0.45rem;
      background: #1d3b63;
      color: #e5f0ff;
      font: inherit;
      cursor: pointer;
    }
    button:active { background: #284c7c; }
    input:focus-visible, button:focus-visible {
      outline: 2px solid #6ea8fe;
      outline-offset: 1px;
    }
  </style>
</head>
<body>
  <main>
    <h1>Visorium</h1>
    <p>Enter the access token printed in the terminal where Visorium is running.</p>
    ${invalid ? '<p class="error">Invalid token.</p>' : ""}
    <form method="post" action="/login">
      <input name="token" type="password" autocomplete="off" autofocus aria-label="Access token" placeholder="Access token">
      <button type="submit">Open gallery</button>
    </form>
  </main>
</body>
</html>`;

export const createAuth = (token: string): Auth => {
  const middleware: RequestHandler = (request, response, next) => {
    const queryToken = getQueryToken(request.originalUrl);
    const bodyToken =
      request.method === "POST" ? getBodyToken(request) : null;
    const candidate = getRequestToken(request);

    if (matchesToken(candidate, token)) {
      if (queryToken || bodyToken) {
        setAuthCookie(request, response, token);
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Referrer-Policy", "no-referrer");

        if (request.path === "/login" || isHtmlRequest(request)) {
          response.redirect(
            302,
            request.path === "/login" ? "/" : cleanUrl(request.originalUrl),
          );
          return;
        }
      }

      next();
      return;
    }

    if (request.path === "/login" || isHtmlRequest(request)) {
      response.status(401);
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Referrer-Policy", "no-referrer");
      response.type("html").send(loginPage(Boolean(queryToken || bodyToken)));
      return;
    }

    response.status(401).type("text/plain").send("Unauthorized");
  };

  const authorizeSocket = (request: IncomingMessage): boolean => {
    const candidate =
      getBearerToken(request.headers.authorization) ??
      getQueryToken(request.url) ??
      parseCookies(request.headers.cookie)[COOKIE_NAME];

    return matchesToken(candidate, token);
  };

  return { token, middleware, authorizeSocket };
};

export const getAuthUrls = (
  token: string,
  host: string,
  port: number,
): string[] => {
  const hosts = new Set<string>();

  if (host === "0.0.0.0" || host === "::") {
    hosts.add("localhost");

    for (const entries of Object.values(networkInterfaces())) {
      for (const entry of entries ?? []) {
        if (entry.family === "IPv4" && !entry.internal) {
          hosts.add(entry.address);
        }
      }
    }
  } else if (host === "127.0.0.1" || host === "::1" || host === "localhost") {
    hosts.add("localhost");
  } else {
    hosts.add(host);
  }

  const encodedToken = encodeURIComponent(token);

  return Array.from(hosts, (candidate) => {
    const displayHost =
      candidate.includes(":") && !candidate.startsWith("[")
        ? `[${candidate}]`
        : candidate;

    return `http://${displayHost}:${port}/?token=${encodedToken}`;
  });
};
