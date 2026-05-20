const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i < 0) continue;
    let v = trimmed.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[trimmed.slice(0, i).trim()] = v;
  }
  return out;
}

async function main() {
  const env = loadEnv();
  const conn = await mysql.createConnection({
    host: env.DATABASE_HOST,
    port: parseInt(env.DATABASE_PORT || '3306', 10),
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { rejectUnauthorized: false },
  });
  const [slides] = await conn.query('SHOW COLUMNS FROM slides');
  const [proposals] = await conn.query('SHOW COLUMNS FROM proposals');
  console.log('Host:', env.DATABASE_HOST, '| DB:', env.DATABASE_NAME);
  console.log('slides:', slides.map((r) => r.Field).join(', '));
  console.log('proposals:', proposals.map((r) => r.Field).join(', '));
  await conn.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
