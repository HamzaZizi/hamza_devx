const request = require('supertest');
const express = require('express');
const todosRouter = require('../routes/todos');

// Mock the db module
jest.mock('../db', () => ({
  query: jest.fn(),
}));

const pool = require('../db');

describe('Todos API', () => {
  let app;

  beforeEach(() => {
    // Create a fresh express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/todos', todosRouter);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/todos', () => {
    it('should return all todos', async () => {
      const mockTodos = [
        { id: 1, title: 'Test todo 1', is_done: false },
        { id: 2, title: 'Test todo 2', is_done: true },
      ];

      pool.query.mockResolvedValue({ rows: mockTodos });

      const response = await request(app).get('/api/todos');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTodos);
      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM todos ORDER BY id ASC');
    });

    it('should return 500 on database error', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/todos');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch todos' });
    });
  });

  describe('POST /api/todos', () => {
    it('should create a new todo', async () => {
      const newTodo = { id: 1, title: 'New todo', is_done: false };
      pool.query.mockResolvedValue({ rows: [newTodo] });

      const response = await request(app)
        .post('/api/todos')
        .send({ title: 'New todo' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(newTodo);
      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO todos (title, is_done) VALUES ($1, false) RETURNING *',
        ['New todo']
      );
    });

    it('should trim whitespace from title', async () => {
      const newTodo = { id: 1, title: 'Trimmed todo', is_done: false };
      pool.query.mockResolvedValue({ rows: [newTodo] });

      const response = await request(app)
        .post('/api/todos')
        .send({ title: '  Trimmed todo  ' });

      expect(response.status).toBe(201);
      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO todos (title, is_done) VALUES ($1, false) RETURNING *',
        ['Trimmed todo']
      );
    });

    it('should return 400 if title is missing', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Title is required' });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should return 400 if title is empty string', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: '' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Title is required' });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should return 400 if title is only whitespace', async () => {
      const response = await request(app)
        .post('/api/todos')
        .send({ title: '   ' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Title is required' });
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/todos')
        .send({ title: 'New todo' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to create todo' });
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('should update todo is_done status', async () => {
      const updatedTodo = { id: 1, title: 'Test todo', is_done: true };
      pool.query.mockResolvedValue({ rows: [updatedTodo] });

      const response = await request(app)
        .put('/api/todos/1')
        .send({ is_done: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedTodo);
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE todos SET is_done = COALESCE($1, is_done), title = COALESCE($2, title) WHERE id = $3 RETURNING *',
        [true, undefined, '1']
      );
    });

    it('should update todo title', async () => {
      const updatedTodo = { id: 1, title: 'Updated title', is_done: false };
      pool.query.mockResolvedValue({ rows: [updatedTodo] });

      const response = await request(app)
        .put('/api/todos/1')
        .send({ title: 'Updated title' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedTodo);
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE todos SET is_done = COALESCE($1, is_done), title = COALESCE($2, title) WHERE id = $3 RETURNING *',
        [undefined, 'Updated title', '1']
      );
    });

    it('should update both title and is_done', async () => {
      const updatedTodo = { id: 1, title: 'Updated title', is_done: true };
      pool.query.mockResolvedValue({ rows: [updatedTodo] });

      const response = await request(app)
        .put('/api/todos/1')
        .send({ title: 'Updated title', is_done: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedTodo);
    });

    it('should return 404 if todo not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/todos/999')
        .send({ is_done: true });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Todo not found' });
    });

    it('should return 500 on database error', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/todos/1')
        .send({ is_done: true });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to update todo' });
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('should delete a todo', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 1 }] });

      const response = await request(app).delete('/api/todos/1');

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM todos WHERE id = $1 RETURNING *',
        ['1']
      );
    });

    it('should return 404 if todo not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app).delete('/api/todos/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Todo not found' });
    });

    it('should return 500 on database error', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/api/todos/1');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to delete todo' });
    });
  });
});
