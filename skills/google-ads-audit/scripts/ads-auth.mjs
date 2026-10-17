// One-time authorization for the Google Ads API (OAuth desktop flow with PKCE).
//
// Usage:  node ads-auth.mjs [--client <client_secret_*.json>] [--developer-token <token>]
//
// Opens the Google login, catches the redirect on 127.0.0.1 and stores the
// refresh token in ~/.config/google-ads-audit/ads.json, next to the developer
// token. After that every pull runs without another login.
//
// Prerequisites in your Google Cloud project (details: docs/api-access.md):
//   1. Google Ads API enabled
//   2. OAuth client of type "Desktop app", its JSON downloaded into
//      ~/.config/google-ads-audit/ (or passed with --client)
//   3. Scope https://www.googleapis.com/auth/adwords added under Data Access
//   4. App published "In production". In "Testing" refresh tokens expire
//      after 7 days.
//
// No dependencies: Node crypto, http and fetch.
// No secret is ever printed, only lengths and states.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'

const SCOPE = 'https://www.googleapis.com/auth/adwords'
const DIR = path.join(os.homedir(), '.config', 'google-ads-audit')
const ADS_FILE = path.join(DIR, 'ads.json')
const args = process.argv.slice(2)
const opt = (name) => { const i = args.indexOf(name); return i > -1 ? args[i + 1] : null }

// ------------------------------------------------- read the OAuth client
function clientConfig() {
  const explicit = opt('--client')
  const file = explicit || (fs.existsSync(DIR)
    ? fs.readdirSync(DIR).filter((f) => /^client_secret.*\.json$/.test(f)).map((f) => path.join(DIR, f))[0]
    : null)
  if (!file) {
    console.error(`No OAuth client found. Expected: ${path.join(DIR, 'client_secret_*.json')}`)
    console.error('Or: node ads-auth.mjs --client <path>')
    process.exit(1)
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  const c = raw.installed || raw.web
  if (!c?.client_id || !c?.client_secret) {
    console.error(`No desktop client in ${path.basename(file)}. Expected a section "installed".`)
    process.exit(1)
  }
  console.log(`OAuth client: ${path.basename(file)}`)
  console.log(`Client ID   : ${c.client_id.split('-')[0]}...apps.googleusercontent.com`)
  return {
    id: c.client_id,
    secret: c.client_secret,
    authUri: c.auth_uri || 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUri: c.token_uri || 'https://oauth2.googleapis.com/token',
  }
}

// -------------------------------------------------------- PKCE parameters
const verifier = crypto.randomBytes(48).toString('base64url')
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
const state = crypto.randomBytes(16).toString('hex')

// ------------------------------------------------------------ flow
const client = clientConfig()

const server = http.createServer()
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
const redirect = `http://127.0.0.1:${port}`

const authUrl = `${client.authUri}?` + new URLSearchParams({
  client_id: client.id,
  redirect_uri: redirect,
  response_type: 'code',
  scope: SCOPE,
  access_type: 'offline',
  prompt: 'consent',
  state,
  code_challenge: challenge,
  code_challenge_method: 'S256',
})

console.log('\nOpen in your browser:\n')
console.log(authUrl)
console.log('\nSign in with the Google account that has access to the ad account.')
console.log('If Google says the app is not verified: "Advanced", then "Go to <your app name>".\n')
console.log('Waiting for the redirect...')

// Open the browser, best effort. If that fails, copy the URL yourself.
// On Windows via rundll32 instead of "cmd /c start": the URL passes as ONE
// argument, so the ampersands in it are not read as separators.
try {
  if (process.platform === 'win32') spawn('rundll32', ['url.dll,FileProtocolHandler', authUrl], { detached: true, stdio: 'ignore' }).unref()
  else if (process.platform === 'darwin') spawn('open', [authUrl], { detached: true, stdio: 'ignore' }).unref()
  else spawn('xdg-open', [authUrl], { detached: true, stdio: 'ignore' }).on('error', () => {}).unref()
} catch {}

const code = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timed out after 15 minutes')), 15 * 60 * 1000)
  server.on('request', (req, res) => {
    const url = new URL(req.url, redirect)
    const done = (msg) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(`<!doctype html><meta charset="utf-8"><body style="font:16px system-ui;padding:60px;max-width:32em">${msg}</body>`)
    }
    if (url.searchParams.get('error')) {
      done('<h1>Cancelled</h1><p>You can close this window.</p>')
      clearTimeout(timer)
      return reject(new Error('Google says: ' + url.searchParams.get('error')))
    }
    const got = url.searchParams.get('code')
    if (!got) return done('<p>Waiting for the redirect from Google...</p>')
    if (url.searchParams.get('state') !== state) {
      done('<h1>Cancelled</h1><p>The state parameter does not match.</p>')
      clearTimeout(timer)
      return reject(new Error('state mismatch, aborting'))
    }
    done('<h1>Done</h1><p>Authorization complete. You can close this window and return to the terminal.</p>')
    clearTimeout(timer)
    resolve(got)
  })
})
server.close()
console.log('Code received, exchanging it for tokens.')

const res = await fetch(client.tokenUri, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code,
    client_id: client.id,
    client_secret: client.secret,
    redirect_uri: redirect,
    grant_type: 'authorization_code',
    code_verifier: verifier,
  }),
})
const tok = await res.json()
if (!tok.refresh_token) {
  console.error('No refresh token received:', tok.error_description || tok.error || 'unknown')
  console.error('Most common cause: the adwords scope is not listed under Data Access.')
  process.exit(1)
}

// ----------------------------------------------------- write ads.json
fs.mkdirSync(DIR, { recursive: true })
const existing = fs.existsSync(ADS_FILE) ? JSON.parse(fs.readFileSync(ADS_FILE, 'utf8')) : {}
const next = {
  ...existing,
  ...(opt('--developer-token') ? { developer_token: opt('--developer-token') } : {}),
  client_id: client.id,
  client_secret: client.secret,
  refresh_token: tok.refresh_token,
}
fs.writeFileSync(ADS_FILE, JSON.stringify(next, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 })

console.log(`\nWritten: ${ADS_FILE}`)
console.log(`  developer_token  : ${next.developer_token ? 'present' : 'MISSING, add it (see docs/api-access.md)'}`)
console.log(`  login_customer_id: ${next.login_customer_id ? 'present' : 'not set (only needed when access runs through a manager account)'}`)
console.log(`  refresh_token    : new, ${tok.refresh_token.length} characters`)
console.log('\nThe file lives outside every repo. Never commit it, never paste it into a prompt.')
