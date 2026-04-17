const { getUser, createUser, listUsers, deleteUser, healthCheck, pool, redis } = require('./app');

afterAll(async () => {
  await pool.end();
  await redis.quit();
});

describe('Health Check', () => {
  it('should connect to PostgreSQL and Redis', async () => {
    const health = await healthCheck();
    expect(health.postgres).toBe('ok');
    expect(health.redis).toBe('ok');
  });
});

describe('User CRUD', () => {
  let testUserId;

  it('should list seeded users', async () => {
    const users = await listUsers();
    expect(users.length).toBeGreaterThanOrEqual(3);
    expect(users[0].username).toBe('alice');
  });

  it('should create a new user', async () => {
    const user = await createUser('testuser', 'test@example.com');
    expect(user.username).toBe('testuser');
    expect(user.email).toBe('test@example.com');
    expect(user.id).toBeDefined();
    testUserId = user.id;
  });

  it('should get user by id (from DB)', async () => {
    const user = await getUser(testUserId);
    expect(user.username).toBe('testuser');
  });

  it('should get user by id (from Redis cache)', async () => {
    // Second call should hit cache
    const user = await getUser(testUserId);
    expect(user.username).toBe('testuser');

    // Verify it's in Redis
    const cached = await redis.get(`user:${testUserId}`);
    expect(cached).not.toBeNull();
    expect(JSON.parse(cached).username).toBe('testuser');
  });

  it('should delete user and clear cache', async () => {
    const deleted = await deleteUser(testUserId);
    expect(deleted.username).toBe('testuser');

    // Cache should be cleared
    const cached = await redis.get(`user:${testUserId}`);
    expect(cached).toBeNull();

    // DB should not have the user
    const user = await getUser(testUserId);
    expect(user).toBeNull();
  });
});
