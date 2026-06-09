// SPDX-License-Identifier: MIT
/**
 * Minimal Express-compatible test harness for exercising REST endpoint
 * registration functions (e.g. apiResearchEndpoints(app)) without booting a
 * real HTTP server. Middleware arrays are ignored — auth middleware is mocked
 * separately in the test files — and the final handler is captured per route.
 *
 * Not a test suite itself (no .test.js suffix), so Jest will not execute it.
 */

/**
 * Builds a chainable mock response object capturing status/json/headers.
 * @returns {object} mock response
 */
function createMockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    ended: false,
    locals: {},
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    res.ended = true;
    return res;
  };
  res.send = (payload) => {
    res.body = payload;
    res.ended = true;
    return res;
  };
  // Intentionally returns a value WITHOUT an .end() method so that the old
  // buggy `response.sendStatus(500).end()` pattern would throw here — guarding
  // against a regression of that bug.
  res.sendStatus = (code) => {
    res.statusCode = code;
    res.ended = true;
    return code;
  };
  res.setHeader = (key, value) => {
    res.headers[key] = value;
    return res;
  };
  res.end = () => {
    res.ended = true;
    return res;
  };
  return res;
}

/**
 * Creates a mock app that records registered routes and can invoke them.
 * @returns {{app: object, call: Function, routes: object}}
 */
function createMockApp() {
  const routes = {};
  const register = (method) => (path, ...rest) => {
    const handler = rest[rest.length - 1];
    routes[`${method} ${path}`] = handler;
  };
  const app = {
    get: register("get"),
    post: register("post"),
    put: register("put"),
    delete: register("delete"),
    patch: register("patch"),
  };

  /**
   * Invokes a previously registered route handler.
   * @param {string} method http method
   * @param {string} path the literal registered path (e.g. "/research/:id")
   * @param {{body?: object, params?: object, query?: object, headers?: object}} [req]
   * @returns {Promise<object>} the mock response
   */
  async function call(method, path, req = {}) {
    const key = `${method.toLowerCase()} ${path}`;
    const handler = routes[key];
    if (!handler) throw new Error(`No route registered for ${key}`);
    const request = {
      body: req.body || {},
      params: req.params || {},
      query: req.query || {},
      header: (name) => (req.headers || {})[name] || "Bearer test-key",
    };
    const response = createMockRes();
    await handler(request, response);
    return response;
  }

  return { app, call, routes };
}

module.exports = { createMockApp, createMockRes };
