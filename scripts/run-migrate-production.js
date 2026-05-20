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

async function columnExists(conn, schema, table, column) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [schema, table, column],
  );
  return rows.length > 0;
}

async function ensureColumn(conn, schema, table, column, ddl) {
  if (await columnExists(conn, schema, table, column)) {
    console.log(`OK (ya existe): ${table}.${column}`);
    return false;
  }
  await conn.query(ddl);
  console.log(`Migracion OK: ${table}.${column} creada.`);
  return true;
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
    console.log('Host:', env.DATABASE_HOST, '| DB:', env.DATABASE_NAME);

    await ensureColumn(
      conn,
      env.DATABASE_NAME,
      'slides',
      'scripts',
      'ALTER TABLE slides ADD COLUMN scripts JSON NULL',
    );

    await ensureColumn(
      conn,
      env.DATABASE_NAME,
      'proposals',
      'theme_config',
      'ALTER TABLE proposals ADD COLUMN theme_config JSON NULL AFTER map_config',
    );

    const [slides] = await conn.query("SHOW COLUMNS FROM slides LIKE 'scripts'");
    const [theme] = await conn.query(
      "SHOW COLUMNS FROM proposals LIKE 'theme_config'",
    );
    console.log('Verificacion slides.scripts:', slides);
    console.log('Verificacion proposals.theme_config:', theme);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
