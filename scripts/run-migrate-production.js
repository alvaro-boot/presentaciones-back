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

  try {
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'slides' AND COLUMN_NAME = 'scripts'`,
      [env.DATABASE_NAME],
    );
    if (cols.length) {
      console.log('La columna scripts ya existe. Nada que hacer.');
    } else {
      await conn.query('ALTER TABLE slides ADD COLUMN scripts JSON NULL');
      console.log('Migracion OK: columna scripts anadida a slides.');
    }
    const [verify] = await conn.query("SHOW COLUMNS FROM slides LIKE 'scripts'");
    console.log('Verificacion:', verify);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
