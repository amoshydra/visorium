import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import test from "node:test";
import express from "express";
import {
  createAuth,
  createToken,
  getAuthUrls,
  matchesToken,
} from "../src/server/auth.js";

const token = "test-token-123";
const auth = createAuth(token);

const startTestServer = async () => {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(auth.middleware);
  app.get("/", (_request, response) => {
    response.type("html").send("<h1>gallery</h1>");
  });
  app.get("/files/test.jpg", (_request, response) => {
    response.type("image/jpeg").send("image");
  });

  const server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return { server, baseUrl: `http://127.0.0.1:${port}` };
};

test("creates and validates tokens", () => {
  const generated = createToken();

  assert.ok(generated.length >= 20);
  assert.equal(matchesToken(generated, generated), true);
  assert.equal(matchesToken("wrong", generated), false);
  assert.equal(matchesToken("", generated), false);
  assert.equal(matchesToken(undefined, generated), false);
});

test("builds localhost and LAN login URLs", () => {
  assert.deepEqual(getAuthUrls(token, "127.0.0.1", 3000), [
    "http://localhost:3000/?token=test-token-123",
  ]);

  const urls = getAuthUrls(token, "0.0.0.0", 3000);
  assert.ok(urls.includes("http://localhost:3000/?token=test-token-123"));
  assert.ok(urls.every((url) => url.includes("token=test-token-123")));
});

test("protects the app and media, and sets a cookie on login", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const unauthorizedApp = await fetch(`${baseUrl}/`, {
    headers: { Accept: "text/html" },
    redirect: "manual",
  });
  assert.equal(unauthorizedApp.status, 401);
  assert.match(await unauthorizedApp.text(), /Access token/);

  const unauthorizedFile = await fetch(`${baseUrl}/files/test.jpg`);
  assert.equal(unauthorizedFile.status, 401);

  const login = await fetch(`${baseUrl}/?token=${encodeURIComponent(token)}`, {
    headers: { Accept: "text/html" },
    redirect: "manual",
  });
  assert.equal(login.status, 302);
  assert.equal(login.headers.get("location"), "/");

  const setCookie = login.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /visorium_token=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
  const cookie = setCookie.split(";")[0];

  const authorizedApp = await fetch(`${baseUrl}/`, {
    headers: { Accept: "text/html", Cookie: cookie },
  });
  assert.equal(authorizedApp.status, 200);
  assert.match(await authorizedApp.text(), /gallery/);

  const authorizedFile = await fetch(`${baseUrl}/files/test.jpg`, {
    headers: { Cookie: cookie },
  });
  assert.equal(authorizedFile.status, 200);

  const bearerFile = await fetch(`${baseUrl}/files/test.jpg`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(bearerFile.status, 200);

  const invalidLogin = await fetch(`${baseUrl}/?token=wrong`, {
    headers: { Accept: "text/html" },
    redirect: "manual",
  });
  assert.equal(invalidLogin.status, 401);
  assert.match(await invalidLogin.text(), /Invalid token/);
});

test("accepts the login form and authenticates sockets", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const login = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `token=${encodeURIComponent(token)}`,
    redirect: "manual",
  });

  assert.equal(login.status, 302);
  assert.equal(login.headers.get("location"), "/");
  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

  assert.equal(
    auth.authorizeSocket({
      headers: { cookie },
      url: "/socket.io/?EIO=4",
    } as unknown as IncomingMessage),
    true,
  );
  assert.equal(
    auth.authorizeSocket({
      headers: {},
      url: "/socket.io/?EIO=4",
    } as unknown as IncomingMessage),
    false,
  );
});
