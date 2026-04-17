const { Pool } = require('pg');
const Redis = require('ioredis');

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://testuser:testpass@localhost:5432/testdb',
});

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function getUser(id) {
  // Check Redis cache first
  const cached = await redis.get(`user:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Query PostgreSQL
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  const user = result.rows[0] || null;

  // Cache in Redis for 60 seconds
  if (user) {
    await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 60);
  }

  return user;
}

async function createUser(username, email) {
  const result = await pool.query(
    'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
    [username, email]
  );
  return result.rows[0];
}

async function listUsers() {
  const result = await pool.query('SELECT * FROM users ORDER BY id');
  return result.rows;
}

async function deleteUser(id) {
  await redis.del(`user:${id}`);
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

async function healthCheck() {
  const pgResult = await pool.query('SELECT 1');
  const redisPong = await redis.ping();
  return {
    postgres: pgResult.rows.length > 0 ? 'ok' : 'fail',
    redis: redisPong === 'PONG' ? 'ok' : 'fail',
  };
}

module.exports = { getUser, createUser, listUsers, deleteUser, healthCheck, pool, redis };
