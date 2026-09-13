import assert from "node:assert/strict";
import test from "node:test";
import { CSP_MODE, securityHeaders } from "../lib/portal/security-headers.ts";

test("os cinco cabeçalhos exigidos estão presentes", () => {
  const headers = securityHeaders();
  const csp =
    CSP_MODE === "enforce" ? "content-security-policy" : "content-security-policy-report-only";

  for (const nome of [
    csp,
    "strict-transport-security",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
  ]) {
    assert.ok(headers[nome], `falta ${nome}`);
  }
});

test("a CSP bloqueia enquadramento e objeto, e fixa a base", () => {
  const headers = securityHeaders();
  const csp = headers["content-security-policy-report-only"] ?? headers["content-security-policy"];
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /default-src 'self'/);
});

test("HSTS tem prazo longo e inclui subdomínios", () => {
  const hsts = securityHeaders()["strict-transport-security"];
  const idade = Number(/max-age=(\d+)/.exec(hsts)?.[1] ?? 0);
  assert.ok(idade >= 31536000, "HSTS deve valer por pelo menos um ano");
  assert.match(hsts, /includeSubDomains/);
});

test("nosniff e referrer-policy conservadora", () => {
  const headers = securityHeaders();
  assert.equal(headers["x-content-type-options"], "nosniff");
  assert.equal(headers["referrer-policy"], "strict-origin-when-cross-origin");
});

test("permissions-policy desliga câmera, microfone e geolocalização", () => {
  const policy = securityHeaders()["permissions-policy"];
  for (const recurso of ["camera=()", "microphone=()", "geolocation=()", "payment=()"]) {
    assert.ok(policy.includes(recurso), `falta ${recurso}`);
  }
});
