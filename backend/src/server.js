const express = require('express');
const cors = require('cors');
const pool = require('./db');
const todosRouter = require('./routes/todos');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.use('/api/todos', todosRouter);

app.listen(PORT, () => {
  console.log(`Todo backend listening on port ${PORT}`);
});
