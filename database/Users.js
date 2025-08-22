const db = require("./db");

async function initUsers() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      jid TEXT UNIQUE NOT NULL,
      name TEXT,
      joined_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function addUser(jid, name) {
  await db.query(
    `INSERT INTO users (jid, name) VALUES ($1, $2)
     ON CONFLICT (jid) DO UPDATE SET name = EXCLUDED.name`,
    [jid, name]
  );
}

async function getUser(jid) {
  const res = await db.query(`SELECT * FROM users WHERE jid = $1`, [jid]);
  return res.rows[0];
}

module.exports = { initUsers, addUser, getUser };
