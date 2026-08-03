import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'

const PATCH_FILE = 'patches/@astrojs+solid-js+7.0.1.patch'
const OFF_DIR = 'patches-off/@astrojs+solid-js+7.0.1.patch'

const mode = process.argv[2]
if (mode !== 'on' && mode !== 'off') {
  console.error('usage: node scripts/toggle-patch.mjs <on|off>')
  process.exit(1)
}

const move = (src, dest) => {
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(src, dest)
  rmSync(src)
}

if (mode === 'on') {
  if (existsSync(OFF_DIR)) {
    move(OFF_DIR, PATCH_FILE)
    console.log('patch on (restored from patches-off/)')
  } else if (existsSync(PATCH_FILE)) {
    console.log('patch on (already enabled)')
  } else {
    console.error('patch on failed: patch file found in neither patches/ nor patches-off/')
    process.exit(1)
  }
} else {
  if (existsSync(PATCH_FILE)) {
    move(PATCH_FILE, OFF_DIR)
    console.log('patch off (moved to patches-off/)')
  } else {
    console.log('patch off (already disabled)')
  }
}

rmSync('node_modules', { recursive: true, force: true })
