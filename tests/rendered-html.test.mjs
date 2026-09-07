import { registerHooks } from 'node:module';
registerHooks({resolve(specifier,context,nextResolve){if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env = {};',shortCircuit:true};return nextResolve(specifier,context)}});
import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders RiskLens workspace without starter metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html=await response.text();
  assert.match(html, /RiskLens/);
  assert.match(html, /Expected annual loss/);
  assert.doesNotMatch(html, developmentPreviewMeta);
});
