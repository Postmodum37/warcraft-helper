// WarcraftLogs v2 client for Node. Credentials come from the environment or the
// warcraftlogs skill's .env; fight-scoped answers are cached on disk, since a
// finished fight never changes and reruns then cost no API points.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ENV_FILE = path.join(__dirname, '../../.claude/skills/warcraftlogs/.env');
const CACHE_DIR = path.join(__dirname, '.cache');

function credentials() {
  if (process.env.WCL_CLIENT_ID && process.env.WCL_CLIENT_SECRET) {
    return { id: process.env.WCL_CLIENT_ID, secret: process.env.WCL_CLIENT_SECRET };
  }
  const env = {};
  const text = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  if (!env.WCL_CLIENT_ID || !env.WCL_CLIENT_SECRET) {
    throw new Error(`WCL_CLIENT_ID and WCL_CLIENT_SECRET must be set, in the environment or ${ENV_FILE}`);
  }
  return { id: env.WCL_CLIENT_ID, secret: env.WCL_CLIENT_SECRET };
}

let token;

async function getToken() {
  if (!token) {
    const { id, secret } = credentials();
    const res = await fetch('https://www.warcraftlogs.com/oauth/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) throw new Error(`WarcraftLogs token: HTTP ${res.status}`);
    token = (await res.json()).access_token;
  }
  return token;
}

async function query(graphql, variables, { cache = false } = {}) {
  const file = path.join(CACHE_DIR, `${crypto.createHash('sha1').update(graphql + JSON.stringify(variables)).digest('hex')}.json`);
  if (cache && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  for (let attempt = 1; ; attempt++) {
    const res = await fetch('https://www.warcraftlogs.com/api/v2/client', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: graphql, variables }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body && !body.errors) {
      if (cache) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(file, JSON.stringify(body.data));
      }
      return body.data;
    }
    if (attempt < 4 && (res.status === 429 || res.status >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
      continue;
    }
    if (res.status === 429) throw new Error('WarcraftLogs API points are used up for this hour. Rerun later: finished fights are cached.');
    throw new Error(`WarcraftLogs HTTP ${res.status}: ${JSON.stringify(body?.errors || body).slice(0, 300)}`);
  }
}

const EVENTS = `query ($code: String!, $fight: Int!, $start: Float!, $end: Float!, $filter: String!, $hostility: HostilityType!, $dataType: EventDataType!) {
  reportData { report(code: $code) {
    events(fightIDs: [$fight], startTime: $start, endTime: $end, hostilityType: $hostility, dataType: $dataType, filterExpression: $filter, limit: 10000) { data nextPageTimestamp }
  } }
}`;

// Every event of one fight matching `filter`, across pages.
async function events({ code, fight, filter, hostility = 'Friendlies', dataType = 'All' }) {
  const all = [];
  for (let start = fight.startTime; start != null; ) {
    const variables = { code, fight: fight.id, start, end: fight.endTime, filter, hostility, dataType };
    const page = (await query(EVENTS, variables, { cache: true })).reportData.report.events;
    all.push(...page.data);
    start = page.nextPageTimestamp;
  }
  return all;
}

module.exports = { query, events };
