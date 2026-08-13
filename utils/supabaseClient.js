const { Pool, Client } = require("pg");

// TODO: move these into .env once one is set up for this project.
const DATABASE_URL = "postgresql://postgres.fkusbdrkocctnymbjpmp:abhasaA.123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";
const DIRECT_URL = "postgresql://postgres.fkusbdrkocctnymbjpmp:abhasaA.123@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

let pool = null;

const getPool = () => {
  if (pool) return pool;

  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  pool.on("error", (error) => {
    console.error("Supabase pool error:", error.message);
  });

  return pool;
};

// Mirrors the Mongo IvrLog schema field-for-field, keyed by the Mongo _id.
// Uses the direct (non-pooled) connection since DDL doesn't play well with pgbouncer transaction pooling.
const ensureIvrLogsTable = async () => {
  const client = new Client({
    connectionString: DIRECT_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS ivr_logs (
        id TEXT PRIMARY KEY,
        callid TEXT NOT NULL,
        agent_phone TEXT,
        customer_phone TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Answered',
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        call_recording TEXT,
        "calledAgents" JSONB NOT NULL DEFAULT '[]',
        call_duration INTEGER NOT NULL DEFAULT 0,
        total_call_duration INTEGER NOT NULL DEFAULT 0,
        "Direction" TEXT NOT NULL DEFAULT 'inbound',
        did TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "isTranscribed" BOOLEAN NOT NULL DEFAULT FALSE,
        "Transcription" TEXT NOT NULL DEFAULT ''
      );
    `);

    // CREATE TABLE IF NOT EXISTS is a no-op when the table already exists, so if it was
    // altered/recreated with columns missing (e.g. by hand in the Supabase dashboard),
    // backfill them here to keep insertIvrLog's column list valid.
    await client.query(`ALTER TABLE ivr_logs ADD COLUMN IF NOT EXISTS agent_phone TEXT`);
    await client.query(`ALTER TABLE ivr_logs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Answered'`);
    await client.query(`ALTER TABLE ivr_logs ADD COLUMN IF NOT EXISTS call_recording TEXT`);
    await client.query(`ALTER TABLE ivr_logs ADD COLUMN IF NOT EXISTS "calledAgents" JSONB NOT NULL DEFAULT '[]'`);
    await client.query(`ALTER TABLE ivr_logs ADD COLUMN IF NOT EXISTS call_duration INTEGER NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE ivr_logs ADD COLUMN IF NOT EXISTS total_call_duration INTEGER NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE ivr_logs ADD COLUMN IF NOT EXISTS "Direction" TEXT NOT NULL DEFAULT 'inbound'`);
    await client.query(`ALTER TABLE ivr_logs ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    await client.query(`ALTER TABLE ivr_logs ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    await client.query(`ALTER TABLE ivr_logs ADD COLUMN IF NOT EXISTS "isTranscribed" BOOLEAN NOT NULL DEFAULT FALSE`);
    await client.query(`ALTER TABLE ivr_logs ADD COLUMN IF NOT EXISTS "Transcription" TEXT NOT NULL DEFAULT ''`);

    console.log("✅ Supabase ivr_logs table verified");
  } catch (error) {
    console.error("❌ Error ensuring ivr_logs table in Supabase:", error.message);
  } finally {
    await client.end();
  }
};

// Expects a saved Mongoose IvrLog document, so it carries _id/createdAt/updatedAt.
const insertIvrLog = async (log) => {
  const db = getPool();
  if (!db) return null;

  const {
    _id,
    callid,
    agent_phone,
    customer_phone,
    status,
    date,
    time,
    call_recording,
    calledAgents,
    call_duration,
    total_call_duration,
    Direction,
    did,
    createdAt,
    updatedAt,
  } = log;

  const now = new Date();

  const result = await db.query(
    `INSERT INTO ivr_logs
      (id, callid, agent_phone, customer_phone, status, date, time, call_recording, "calledAgents", call_duration, total_call_duration, "Direction", did, "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [
      String(_id),
      callid,
      agent_phone || null,
      customer_phone,
      status,
      date,
      time,
      call_recording || null,
      JSON.stringify(calledAgents || []),
      call_duration || 0,
      total_call_duration || 0,
      Direction || "inbound",
      did,
      createdAt || now,
      updatedAt || now,
    ]
  );

  return result.rows[0] || null;
};

module.exports = {
  getPool,
  ensureIvrLogsTable,
  insertIvrLog,
};
