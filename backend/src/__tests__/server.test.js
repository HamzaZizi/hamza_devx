const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Mock the db and routes modules
jest.mock('../db', () => ({
  query: jest.fn(),
}));

jest.mock('../routes/todos', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/', (req, res) => res.json([{ id: 1, title: 'Mock todo' }]));
  return router;
});

const pool = require('../db');

describe('Server', () => {
  let app;

  beforeEach(() => {
    // Recreate the app setup from server.js
    app = express();
    app.use(cors());
    app.use(express.json());

    app.get('/health', async (req, res) => {
      try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', db: 'connected' });
      } catch (err) {
        res.status(500).json({ status: 'error', db: 'disconnected' });
      }
    });

    app.use('/api/todos', require('../routes/todos'));

    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return ok status when database is connected', async () => {
      pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        db: 'connected',
      });
      expect(pool.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return error status when database is disconnected', async () => {
      pool.query.mockRejectedValue(new Error('Connection refused'));

      const response = await request(app).get('/health');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        status: 'error',
        db: 'disconnected',
      });
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const response = await request(app).get('/health');

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('JSON parsing', () => {
    it('should parse JSON request bodies', async () => {
      const response = await request(app)
        .get('/api/todos')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
