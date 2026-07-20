import { timingSafeEqual } from "node:crypto";

const unauthorizedHeaders = {
  "Cache-Control": "no-store",
  "WWW-Authenticate": 'Basic realm="Runline", charset="UTF-8"',
};

function safeEqual(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);

  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

export function hasConfiguredAccess() {
  return Boolean(process.env.APP_USERNAME && process.env.APP_PASSWORD);
}

export function isAuthorized(request: Request) {
  const expectedUsername = process.env.APP_USERNAME;
  const expectedPassword = process.env.APP_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return false;

  try {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;

    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);

    return safeEqual(username, expectedUsername) && safeEqual(password, expectedPassword);
  } catch {
    return false;
  }
}

export function unauthorizedResponse() {
  return Response.json(
    { error: "Authentication required." },
    { status: 401, headers: unauthorizedHeaders },
  );
}

export function requireAuthorization(request: Request) {
  return isAuthorized(request) ? null : unauthorizedResponse();
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}
