const { Pool } = require('pg');

// Mock pg module
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('Database Pool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the require cache to get a fresh instance
    jest.resetModules();
  });

  it('should create pool with default configuration', () => {
    require('../db');

    expect(Pool).toHaveBeenCalledWith({
      host: 'localhost',
      port: 5432,
      user: 'todo_user',
      password: 'todo_pass',
      database: 'todo_db',
    });
  });

  it('should create pool with environment variables', () => {
    process.env.DB_HOST = 'custom-host';
    process.env.DB_PORT = '5433';
    process.env.DB_USER = 'custom_user';
    process.env.DB_PASSWORD = 'custom_pass';
    process.env.DB_NAME = 'custom_db';

    require('../db');

    expect(Pool).toHaveBeenCalledWith({
      host: 'custom-host',
      port: '5433',
      user: 'custom_user',
      password: 'custom_pass',
      database: 'custom_db',
    });

    // Clean up
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;
  });

  it('should export a pool instance', () => {
    const pool = require('../db');

    expect(pool).toBeDefined();
    expect(typeof pool.query).toBe('function');
  });
});
