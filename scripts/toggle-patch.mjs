import { readFileSync, rmSync, writeFileSync } from 'node:fs'

const FIXED = `allowBuilds:
  esbuild: true
patchedDependencies:
  '@astrojs/solid-js@7.0.1': patches/@astrojs+solid-js@7.0.1.patch
`
const BROKEN = `allowBuilds:
  esbuild: true
`

const mode = process.argv[2]
if (mode !== 'on' && mode !== 'off') {
  console.error('usage: node scripts/toggle-patch.mjs <on|off>')
  process.exit(1)
}

const before = readFileSync('pnpm-workspace.yaml', 'utf8')
const after = mode === 'on' ? FIXED : BROKEN

writeFileSync('pnpm-workspace.yaml', after)
rmSync('node_modules', { recursive: true, force: true })

console.log(`patch ${mode} (pnpm-workspace.yaml: ${before.includes('patchedDependencies') ? 'with' : 'without'} patchedDependencies -> ${after.includes('patchedDependencies') ? 'with' : 'without'})`)
