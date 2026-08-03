import { existsSync, renameSync, rmSync } from 'node:fs'

const PATCH_FILE = 'patches/@astrojs+solid-js+7.0.1.patch'
const DISABLED = '.astro-solid-patch.disabled'

const mode = process.argv[2]
if (mode !== 'on' && mode !== 'off') {
  console.error('usage: node scripts/toggle-patch.mjs <on|off>')
  process.exit(1)
}

if (mode === 'on') {
  if (existsSync(DISABLED)) {
    renameSync(DISABLED, PATCH_FILE)
    console.log('patch on (patch file restored)')
  } else {
    console.log('patch on (already enabled)')
  }
} else {
  if (existsSync(PATCH_FILE)) {
    renameSync(PATCH_FILE, DISABLED)
    console.log('patch off (patch file moved out of patches/)')
  } else {
    console.log('patch off (already disabled)')
  }
}

rmSync('node_modules', { recursive: true, force: true })
