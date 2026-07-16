// Requests go through a relative /api path.
// In both docker-compose and Kubernetes, nginx (this container) proxies
// /api/* to the backend service - see nginx.conf.
const API_BASE = '/api/todos';

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const status = document.getElementById('status');

function setStatus(msg, isError = false) {
  status.textContent = msg;
  status.style.color = isError ? '#c0392b' : '#888';
}

async function fetchTodos() {
  setStatus('Loading...');
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('Failed to load todos');
    const todos = await res.json();
    renderTodos(todos);
    setStatus('');
  } catch (err) {
    setStatus(err.message, true);
  }
}

function renderTodos(todos) {
  list.innerHTML = '';
  todos.forEach((todo) => {
    const li = document.createElement('li');
    li.className = todo.is_done ? 'done' : '';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.is_done;
    checkbox.addEventListener('change', () => toggleTodo(todo.id, checkbox.checked));

    const span = document.createElement('span');
    span.textContent = todo.title;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-btn';
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

    li.append(checkbox, span, deleteBtn);
    list.appendChild(li);
  });
}

async function addTodo(title) {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to add todo');
    await fetchTodos();
  } catch (err) {
    setStatus(err.message, true);
  }
}

async function toggleTodo(id, is_done) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_done }),
    });
    if (!res.ok) throw new Error('Failed to update todo');
    await fetchTodos();
  } catch (err) {
    setStatus(err.message, true);
  }
}

async function deleteTodo(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete todo');
    await fetchTodos();
  } catch (err) {
    setStatus(err.message, true);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = input.value.trim();
  if (!title) return;
  input.value = '';
  addTodo(title);
});

fetchTodos();
