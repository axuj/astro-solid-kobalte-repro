import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'

const PATCH_FILE = 'patches/@astrojs+solid-js+7.0.1.patch'
const OFF_DIR = 'patches-off/@astrojs+solid-js+7.0.1.patch'

const mode = process.argv[2]
if (mode !== 'on' && mode !== 'off') {
  console.error('usage: node scripts/toggle-patch.mjs <on|off>')
  process.exit(1)
}

if (mode === 'on') {
  if (existsSync(OFF_DIR)) {
    renameSync(OFF_DIR, PATCH_FILE)
    console.log('patch on (restored from patches-off/)')
  } else {
    console.log('patch on (already enabled)')
  }
} else {
  if (existsSync(PATCH_FILE)) {
    mkdirSync('patches-off', { recursive: true })
    renameSync(PATCH_FILE, OFF_DIR)
    console.log('patch off (moved to patches-off/)')
  } else {
    console.log('patch off (already disabled)')
  }
}

rmSync('node_modules', { recursive: true, force: true })
