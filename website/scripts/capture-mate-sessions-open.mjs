/**
 * Real-browser evidence on the REAL Crewmates page: a Bot's Sessions tab opens a
 * session from its recap. Each expanded row shows the recap's one action:
 *
 *   - a live row: **Open session**;
 *   - a closed row: a line saying the session is closed and that Reopen brings
 *     back its saved conversation, then **Reopen session**; a failed reopen keeps
 *     the person here and says so under the button.
 *
 * The component's `remote_crew` branch (a line, no button) is not rendered here:
 * the crew-workers route lists no remote worker under a Bot root
 * (`api_crew_workers` appends them only for a Crew Mode root), so a Bot's tab
 * never reaches that state today and a frame of it would show a state the
 * product cannot show.
 *
 * Runs the built SPA behind `serveDist` with every `/api/**` answered from
 * fixtures (`stubDashboardApi`): no gateway, no auth, no kiro-cli. The fixture
 * rows carry the keys the route sends (a closed row has an empty `created_by`),
 * and the resume route answers a failure on purpose, so the failed-reopen line
 * can be shown.
 *
 * Frames per theme (light, dark), clipped to the card:
 *   01-live-open-<theme>.png   02-closed-reopen-<theme>.png   03-closed-reopen-failed-<theme>.png
 *
 * Usage (in website/):
 *   node scripts/capture-mate-sessions-open.mjs ../temp-screenshots/mate-sessions-open
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { json } from './lib/boot-api.mjs'
import { serveDist } from './lib/serve-dist.mjs'
import { stubDashboardApi, logPageProblems } from './lib/stub-dashboard-api.mjs'

const OUT = process.argv[2] || join(process.env.KIROCREW_SCRATCH || '/tmp', 'mate-sessions-open')
mkdirSync(OUT, { recursive: true })

const now = Math.floor(Date.now() / 1000)
const iso = (secsAgo) => new Date((now - secsAgo) * 1000).toISOString()
const MATE = 'member-kiro'
const MEMBER = {
  name: 'kiro', slug: 'kiro', display_name: 'Kiro', bound: true, slot_key: MATE, running: true,
  kiro_agent: 'frontend', workspace: '/srv/repos/kiro', memory_store: 'member-kiro',
  memory_version: 2, memory_owner: 'kiro', model: '', source: 'kirocrew',
  last_active_ts: now - 60, last_message: 'All 85 checks are green. Only human review is left.',
}
const AGENTS = [{
  name: 'kiro', display_name: 'Kiro', kiro_agent: 'frontend', workspace: '/srv/repos/kiro',
  memory_store: 'member-kiro', model: '', source: 'kirocrew',
  description: 'Frontend crewmate for the Kiro Crew dashboard.',
}]
const SLOTS = [
  { key: MATE, title: 'Kiro', mode: 'member', created: iso(86400), last_ts: iso(60), running: true, project: '/srv/repos/kiro', agent: 'kiro' },
  { key: 'w-live', title: 'Review PR #15731 as a new user', created_by: MATE, mate_root: MATE, created: iso(1500), last_ts: iso(120), running: true, project: '/srv/repos/kiro' },
]
const row = (key, title, over = {}) => ({
  key, title, agent: 'kirocrew-worker', status: 'idle', group: 'waiting', last_activity: iso(120),
  ledger_item: 'it_1', summary: '', created_by: MATE, dispatched_by: MATE, ...over,
})
const WORKERS = {
  root: MATE, root_kind: 'mate',
  workers: [
    row('w-live', 'Review PR #15731 as a new user', { status: 'working', group: 'working', summary: 'Reading the diff as a first-time user' }),
    row('w-closed', 'Explain the panel IA from the sketch', { status: 'closed', group: 'done', last_activity: '', created_by: '', summary: 'Wrote the walkthrough and closed its tab' }),
  ],
}
const recap = (key, title, over = {}) => ({
  key, root: MATE, title, ledger_item: 'it_1', status: 'progress', reason: '', state: 'open',
  summary: 'Draft done, two screenshots left.', decision: '', pr: null, pr_url: '', artifacts: {},
  last_update: iso(120), open_approvals: 0, approvals: [], open_questions: 0, live: true, ...over,
})
const RECAPS = {
  'w-live': recap('w-live', 'Review PR #15731 as a new user'),
  'w-closed': recap('w-closed', 'Explain the panel IA from the sketch', { status: 'done', state: 'accepted', summary: 'Walkthrough written and accepted.', live: false }),
}
const STORAGE = { 'mc-lang': 'en', 'mc-crewmates-onboarded': '1', 'mc-crewmates-page-entered': '1', 'mc-nav': '1', 'mc-members-panel-open': '0' }

const extra = async (path, route) => {
  if (path === '/api/members') { await json(route, { members: [MEMBER], default_agent: 'kirocrew' }); return true }
  if (path === '/api/agents') { await json(route, { agents: AGENTS, default_agent: 'kiro' }); return true }
  if (path === '/api/crons') { await json(route, { jobs: [] }); return true }
  if (path === '/api/cron-folders') { await json(route, []); return true }
  if (path === '/api/default-agent') { await json(route, { default_agent: 'kirocrew' }); return true }
  if (/^\/api\/members\/[^/]+\/thread$/.test(path)) { await json(route, { slot_key: MATE, slug: 'kiro', member: 'kiro', created: false }); return true }
  if (/^\/api\/members\/[^/]+\/activity$/.test(path)) { await json(route, { slug: '', member: '', capped: false, entries: [] }); return true }
  if (/^\/api\/members\/[^/]+\/goals$/.test(path)) { await json(route, { goals: [] }); return true }
  if (/^\/api\/members\/[^/]+\/briefing$/.test(path)) { await json(route, { slug: '', member: '', supported: true, text: '', updated_ts: 0, redacted: false, truncated: false }); return true }
  if (/^\/api\/members\/[^/]+\/panel$/.test(path)) { await json(route, { panel: null, html: null }); return true }
  if (path === '/api/autonudge') { await json(route, { enabled: true, loops: [] }); return true }
  if (/^\/api\/autonudge\/slot\//.test(path)) { await json(route, { enabled: true, loop: null }); return true }
  if (path === '/api/monitors') { await json(route, { enabled: true, monitors: [] }); return true }
  if (/^\/api\/monitors\/slot\//.test(path)) { await json(route, { enabled: true, monitor: null }); return true }
  if (path === '/api/teams') { await json(route, { teams: [] }); return true }
  if (path === `/api/chat/slots/${MATE}/crew-workers`) { await json(route, WORKERS); return true }
  const m = path.match(/^\/api\/chat\/slots\/[^/]+\/crew-workers\/([^/]+)\/recap$/)
  if (m) { await json(route, RECAPS[decodeURIComponent(m[1])] ?? RECAPS['w-live']); return true }
  // The saved conversation is gone: the reopen fails and the row must say so.
  if (/^\/api\/chat\/slots\/[^/]+\/resume$/.test(path)) { await json(route, { ok: false, error: 'not found' }, 404); return true }
  return false
}

const { srv, base } = await serveDist()
const browser = await chromium.launch()
let failed = false
function check(name, ok, detail = '') {
  console.log(`${name}: ${ok ? 'OK' : 'MISMATCH'} ${detail}`)
  if (!ok) failed = true
}

for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1500, height: 940 }, deviceScaleFactor: 2, colorScheme: theme })
  const page = await context.newPage()
  logPageProblems(page)
  await stubDashboardApi(page, { theme, extra, slots: SLOTS, localStorageEntries: STORAGE })
  await page.goto(`${base}/members?member=kiro`, { waitUntil: 'domcontentloaded' })
  const pill = page.getByTestId('member-identity-pill')
  await pill.waitFor({ state: 'visible', timeout: 30000 })
  await pill.click()
  const card = page.getByTestId('crew-profile-card')
  await card.waitFor({ state: 'visible', timeout: 10000 })
  await page.getByTestId('mate-sessions').waitFor({ state: 'visible', timeout: 20000 })
  // Done is folded by default: unfold it so the closed row can be expanded.
  await page.getByTestId('mate-sessions-done').locator('summary').click()
  const rowOf = (title) => page.getByTestId('mate-session-row').filter({ hasText: title })
  const expand = async (title) => {
    await rowOf(title).getByTestId('mate-session-toggle').click()
    await rowOf(title).getByTestId('mate-recap').waitFor({ state: 'visible', timeout: 10000 })
  }
  const shoot = (name) => page.mouse.move(5, 5).then(() => card.screenshot({ path: join(OUT, `${name}-${theme}.png`) }))

  // 01: a live row's recap carries Open session and no closed-state line.
  await expand('Review PR #15731 as a new user')
  const live = rowOf('Review PR #15731 as a new user')
  check(`[${theme}] live row offers Open session`, (await live.getByRole('button', { name: 'Open session: Review PR #15731 as a new user' }).count()) === 1)
  check(`[${theme}] live row says nothing about being closed`, (await live.getByTestId('mate-session-closed-note').count()) === 0)
  await shoot('01-live-open')

  // 02: a closed row says it is closed, what Reopen does, and offers Reopen session.
  await expand('Explain the panel IA from the sketch')
  const closed = rowOf('Explain the panel IA from the sketch')
  const note = await closed.getByTestId('mate-session-closed-note').innerText()
  check(`[${theme}] closed row names the state and the safe outcome`, note === 'This session is closed. Reopening brings back its saved conversation; nothing runs again.', note)
  const reopen = closed.getByRole('button', { name: 'Reopen session: Explain the panel IA from the sketch' })
  check(`[${theme}] closed row offers Reopen session`, (await reopen.count()) === 1)
  await shoot('02-closed-reopen')

  // 03: the reopen fails (the fixture's resume route refuses): the person stays and the row says so.
  await reopen.click()
  await closed.getByTestId('mate-session-reopen-failed').waitFor({ state: 'visible', timeout: 10000 })
  check(`[${theme}] a failed reopen keeps the page`, page.url().includes('/members'), page.url())
  check(`[${theme}] the button is pressable again`, (await reopen.getAttribute('aria-disabled')) === null)
  await shoot('03-closed-reopen-failed')
  await context.close()
}

await browser.close()
srv.close()
if (failed) { console.error('check(s) failed'); process.exit(1) }
console.log(`wrote ${OUT}`)
