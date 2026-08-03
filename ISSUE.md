# [astro] Bug report: prerendered pages crash when a Solid component uses kobalte (`Client-only API called on the server side`)

## Description

When a Solid component rendered with `client:load` imports `@kobalte/core` (or any Solid package that ships a browser-precompiled artifact via the `exports.solid` condition), the static build fails during prerendering with:

```
[ERROR] Caught error rendering /: Error: Client-only API called on the server side. Run client-only code in onMount, or conditionally run client-only component with <Show>.
    at notSup (node_modules/.pnpm/solid-js@1.9.14/node_modules/solid-js/web/dist/server.js:760:9)
```

`astro dev` works fine; only `astro build` (prerender environment) crashes.

## Versions

- astro: 7.1.6
- @astrojs/solid-js: 7.0.1
- @kobalte/core: 0.13.12
- solid-js: 1.9.14
- pnpm: 11.17.0
- OS: Windows

## Reproduction

Repository: https://github.com/axuj/astro-solid-kobalte-repro

Steps:

1. `pnpm install`
2. `pnpm build`

Minimal code:

`src/pages/index.astro`:

```astro
---
import KobalteDemo from '../components/KobalteDemo';
---
<html>
  <head><title>repro</title></head>
  <body>
    <KobalteDemo client:load />
  </body>
</html>
```

`src/components/KobalteDemo.tsx`:

```tsx
import * as TooltipPrimitive from '@kobalte/core/tooltip'

export default function KobalteDemo() {
  return (
    <TooltipPrimitive.Root gutter={4}>
      <TooltipPrimitive.Trigger>Hover me</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content>
          <p>Tooltip content</p>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
```

## Expected behavior

`astro build` succeeds and prerenders the page without executing the island's browser-only module graph.

## Actual behavior

Build fails with the error above.

## Root cause analysis

`@kobalte/core` resolves through its `exports.solid` condition to a precompiled browser artifact:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "solid": "./dist/index.jsx",
    "default": "./dist/index.js"
  }
}
```

Its chunks call browser-only Solid APIs (e.g. `template()`) at module top level.

During the static build, the `prerender` environment does **not** bundle Solid-ecosystem packages: they are left external and resolved by Node. Node does not know the `solid` condition and picks the `default` entry, whose top-level code calls browser-only APIs that are stubbed with `notSup` in `solid-js/web/dist/server.js` — hence the crash.

`@astrojs/svelte` already solved the identical problem by crawling framework packages and injecting `resolve.noExternal` into non-client build environments (see https://github.com/withastro/astro/pull/16210). `@astrojs/solid-js` is missing the equivalent logic: it has `configEnvironmentPlugin` (used for `optimizeDeps.include/exclude`) but never broadcasts a `noExternal` list of Solid packages to the `prerender` environment.

## Workaround (verified, toggle with two commands)

This repo ships a patch at `patches/@astrojs+solid-js@7.0.1.patch`, applied via `patchedDependencies` in `pnpm-workspace.yaml`. Switch between the two states with:

```
pnpm repro:broken   # toggles the patch off -> build crashes with Client-only API error
pnpm repro:fixed    # toggles the patch on  -> build succeeds
```

Each command rewrites `pnpm-workspace.yaml`, wipes `node_modules` for a clean reinstall, then runs `astro build`. `vitefu` stays in `package.json` permanently (it is harmless without the patch and required by it).

The patch ports the svelte approach into `@astrojs/solid-js`'s `dist/index.js`:

1. Crawl Solid packages with `vitefu`'s `crawlFrameworkPkgs` (`isBuild: false`, matching any package whose `exports` contains a `solid` condition via a recursive `containsSolidField`).
2. Pass the result (`solidPackages.ssr.noExternal`) into `configEnvironmentPlugin`.
3. In `configEnvironment`, inject `resolve: { noExternal: solidNoExternal }` for every environment where `environmentName !== 'client'`.

Key diff:

```diff
+import { crawlFrameworkPkgs } from "vitefu";
+import { fileURLToPath } from "node:url";
 import solid, {} from "vite-plugin-solid";
 import { getContainerRenderer as getContainerRendererImpl } from "./container-renderer.js";
+function containsSolidField(fields) {
+  const keys = Object.keys(fields);
+  for (let i = 0; i < keys.length; i++) {
+    const key = keys[i];
+    if (key === "solid") return true;
+    if (typeof fields[key] === "object" && fields[key] != null && containsSolidField(fields[key]))
+      return true;
+  }
+  return false;
+}
...
      "astro:config:setup": async ({
+        config,
         command, addRenderer, updateConfig, injectScript, logger
       }) => {
         ...
         addRenderer(getContainerRendererImpl());
+        const solidPackages = await crawlFrameworkPkgs({
+          root: fileURLToPath(config.root),
+          isBuild: false,
+          isFrameworkPkgByJson(pkgJson) {
+            return containsSolidField(pkgJson.exports || {});
+          }
+        });
         updateConfig({
-          vite: getViteConfiguration(options, devtoolsPlugin)
+          vite: getViteConfiguration(options, devtoolsPlugin, solidPackages.ssr.noExternal)
         });
...
-function configEnvironmentPlugin() {
+function configEnvironmentPlugin(solidNoExternal) {
   return {
     name: "@astrojs/solid:config-environment",
     configEnvironment(environmentName) {
-      return {
+      const result = {
         optimizeDeps: {
           include: environmentName === "client" ? ["@astrojs/solid-js/client.js"] : [],
           exclude: ["@astrojs/solid-js/server.js"]
         }
       };
+      if (environmentName !== "client") {
+        result.resolve = { noExternal: solidNoExternal };
+      }
+      return result;
     }
   };
 }
```

Note: the patch imports `vitefu`, so this repro lists it in `package.json` explicitly. An upstream fix should add `vitefu` to `@astrojs/solid-js`'s own `dependencies` (as `@astrojs/svelte` does).

## Suggested fix

Port `crawlFrameworkPkgs` + non-client `noExternal` injection from `@astrojs/svelte` (PR #16210) into `@astrojs/solid-js`, and add `vitefu` to its dependencies.
