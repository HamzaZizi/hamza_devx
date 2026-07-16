// Setup file for Jest tests
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
});
