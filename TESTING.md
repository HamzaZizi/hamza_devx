# Testing Guide

This document describes how to run unit tests for the Todo App.

## Backend Tests

The backend uses **Jest** and **Supertest** for testing the Express API.

### Setup

```bash
cd backend
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Test Coverage

The backend tests cover:

- **todos.test.js**: All CRUD operations on the `/api/todos` endpoint
  - GET all todos
  - POST new todo (with validation)
  - PUT update todo (is_done and title)
  - DELETE todo
  - Error handling for all operations

- **server.test.js**: Server configuration and health endpoint
  - Health check endpoint
  - CORS configuration
  - JSON body parsing

- **db.test.js**: Database connection pool configuration
  - Default configuration
  - Environment variable overrides

### Test Structure

Tests use **mocked database connections** to avoid requiring a real PostgreSQL instance. The `pg` module is mocked using Jest.

## Frontend Tests

The frontend uses **Jest** with **jsdom** for testing the vanilla JavaScript application.

### Setup

```bash
cd frontend
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Test Coverage

The frontend tests cover:

- **app.test.js**: All client-side functionality
  - Status message display
  - Fetching todos from API
  - Rendering todos in the DOM
  - Adding new todos
  - Toggling todo completion status
  - Deleting todos
  - Form submission handling
  - Event listeners (checkbox change, delete button click)
  - Error handling for network requests

### Test Structure

Tests use **mocked fetch API** to simulate backend responses without making real network requests. The DOM is simulated using jsdom.

## Continuous Integration

To run tests in CI/CD pipelines:

```bash
# Backend
cd backend && npm install && npm test

# Frontend
cd frontend && npm install && npm test
```

## Test Best Practices

1. **Isolation**: Each test is independent and doesn't rely on other tests
2. **Mocking**: External dependencies (database, network) are mocked
3. **Coverage**: Aim for high code coverage (>80%)
4. **Fast**: Tests run quickly without external dependencies
5. **Clear**: Test names clearly describe what is being tested

## Troubleshooting

### Backend Tests

If you see errors about missing modules:
```bash
cd backend
npm install jest supertest --save-dev
```

### Frontend Tests

If you see errors about jsdom:
```bash
cd frontend
npm install jest jest-environment-jsdom --save-dev
```

## Adding New Tests

When adding new features:

1. Write tests **before** or **alongside** the implementation
2. Ensure all edge cases are covered
3. Test both success and error scenarios
4. Keep tests focused and simple
5. Use descriptive test names

### Example Test Structure

```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup code
  });

  it('should do something successfully', async () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = await functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });

  it('should handle errors gracefully', async () => {
    // Test error scenario
  });
});
```
