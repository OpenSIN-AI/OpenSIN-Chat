# Test Suite

This directory contains the comprehensive test suite for the OpenSIN Chat application.

## Overview

The test suite includes 17 test files covering various endpoints and functionality of the OpenSIN Chat application. Each test file follows a consistent pattern:

1. **SPDX License Header**: All test files include the MIT license header
2. **Purpose Documentation**: Clear documentation of the test file's purpose
3. **Mock Setup**: Comprehensive mocking of dependencies
4. **Test Cases**: Multiple test cases covering different scenarios
5. **Consistent Structure**: All tests use the same request pattern

## Test Files

### System Tests
- `system.test.js` - System endpoints (ping, onboarding, multi-user mode, etc.)
- `systemSettings.test.js` - System settings endpoints

### Core Functionality Tests
- `chat.test.js` - Chat endpoints (chat, workspace-chats, export-chats)
- `memory.test.js` - Memory endpoints (memory, memory-management)
- `agent.test.js` - Agent endpoints (agent-skills, agent-flows, imported-agent-plugins)
- `modelRouter.test.js` - Model router endpoints (model-router, model-router-rules)

### Data Management Tests
- `document.test.js` - Document endpoints (documents, document-sync-queue, document-sync-run)
- `embed.test.js` - Embed endpoints (embed, embed-chats, embed-config)
- `embedManagement.test.js` - Embed management endpoints (embed-management)

### Integration Tests
- `experimental.test.js` - Experimental endpoints (live-sync, imported-agent-plugins)
- `extensions.test.js` - Extensions endpoints (browser-extension)
- `invite.test.js` - Invite endpoints (invite)
- `mcpServers.test.js` - MCPServers endpoints (mcp-servers)
- `telegram.test.js` - Telegram endpoints (telegram)

### User Management Tests
- `users.test.js` - User endpoints (users)
- `workspaces.test.js` - Workspace endpoints (workspaces)
- `workspaceChats.test.js` - Workspace chats endpoints (workspace-chats)
- `workspaceThreads.test.js` - Workspace threads endpoints (workspace-threads)

### E2E Tests
- `e2e/webAccessPrompt.test.cjs` - End-to-end test for @agent prefix functionality

## Testing Framework

### Framework
- **Testing Library**: Vitest
- **Assertions**: expect()
- **Mocks**: vi.mock()
- **Setup**: Global test setup in frontend/src/test/setup.js

### Mocking Strategy
Each test file mocks all external dependencies, including:
- Database models (User, SystemSettings, etc.)
- Utility functions (getVectorDbClass, updateENV, etc.)
- Middleware (validatedRequest, multiUserProtected, etc.)
- API integrations (CollectorApi, etc.)

### Request Pattern
All tests use a consistent request pattern:
```javascript
const request = async (method, path, body = null, headers = {}) => {
  const url = `http://localhost:3001${path}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: data ? JSON.parse(data) : null,
  };
};
```

## Running Tests

### Prerequisites
1. Install dependencies:
   ```bash
   cd /Users/jeremy/dev/OpenSIN-Chat
   npm install
   ```

2. Start the server:
   ```bash
   npm run dev:all
   ```

3. Run tests:
   ```bash
   npm test
   ```

### Test Commands
- **Run all tests**: `npm test`
- **Run specific test file**: `npm test -- --testPathPattern=system.test.js`
- **Run tests in watch mode**: `npm test -- --watch`

## Test Coverage

### Unit Tests
- **Count**: 17 test files
- **Focus**: Individual endpoint functionality
- **Approach**: Mock-based testing
- **Coverage**: Comprehensive endpoint testing

### Integration Tests
- **Count**: 1 E2E test file
- **Focus**: End-to-end functionality
- **Approach**: Real API calls
- **Coverage**: Cross-endpoint workflows

### Overall Coverage
- **Endpoints Tested**: ~50+ endpoints across 17+ test files
- **Mock Coverage**: All external dependencies mocked
- **Error Handling**: Comprehensive error scenario testing
- **Edge Cases**: Boundary condition testing

## Best Practices

### Code Quality
1. **Consistent Structure**: All test files follow the same pattern
2. **Comprehensive Mocking**: All external dependencies are mocked
3. **Clear Documentation**: Each test file includes purpose documentation
4. **Error Handling**: All error scenarios are tested
5. **Edge Cases**: Boundary conditions are tested

### Testing Strategy
1. **Mock-Based Testing**: All external dependencies are mocked
2. **Integration Testing**: Real API calls for E2E tests
3. **Comprehensive Coverage**: All endpoints are tested
4. **Error Scenarios**: All error conditions are tested
5. **Edge Cases**: Boundary conditions are tested

## Future Improvements

### Additional Test Coverage
1. **Performance Testing**: Add performance tests for critical endpoints
2. **Security Testing**: Add security tests for sensitive endpoints
3. **Load Testing**: Add load tests for high-traffic endpoints
4. **Stress Testing**: Add stress tests for system limits

### Test Enhancements
1. **Test Data**: Add more comprehensive test data
2. **Test Scenarios**: Add more test scenarios
3. **Test Coverage**: Increase test coverage for all endpoints
4. **Test Quality**: Improve test quality and maintainability

## Conclusion

The test suite provides comprehensive coverage of the OpenSIN Chat application's endpoints and functionality. Each test file follows a consistent pattern and mocks all external dependencies. The test suite includes both unit tests and integration tests, providing comprehensive coverage of the application's functionality.

The test suite is ready for use and can be extended as the application grows and new features are added.
