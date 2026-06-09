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
function createMockRes(locals = {}) {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    ended: false,
    locals: { ...locals },
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
  res.sendStatus = (code) => {
    res.statusCode = code;
    res.ended = true;
    return res;
  };
  res.setHeader = (key, value) => {
    res.headers[key] = value;
    return res;
  };
  res.flushHeaders = () => {
    return res;
  };
  res.writeHead = (code, headers) => {
    res.statusCode = code;
    if (headers) Object.assign(res.headers, headers);
    return res;
  };
  res.end = (data) => {
    if (data !== undefined) res.body = data;
    res.ended = true;
    return res;
  };
  return res;
}

/**
 * Converts an Express-style path pattern (e.g. "/admin/user/:id") to a regex
 * and extracts param names.
 * @param {string} pattern
 * @returns {{regex: RegExp, paramNames: string[]}}
 */
function pathToRegex(pattern) {
  const paramNames = [];
  const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  return { regex: new RegExp(`^${regexStr}$`), paramNames };
}

/**
 * Creates a mock app that records registered routes and can invoke them.
 * @returns {{app: object, call: Function, routes: object}}
 */
function createMockApp() {
  const routes = [];
  const register = (method) => (pattern, ...rest) => {
    const handler = rest[rest.length - 1];
    const { regex, paramNames } = pathToRegex(pattern);
    routes.push({ method: method.toLowerCase(), pattern, regex, paramNames, handler });
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
   * @param {string} path the actual path (e.g. "/admin/user/2")
   * @param {{body?: object, params?: object, query?: object, headers?: object, locals?: object}} [req]
   * @returns {Promise<object>} the mock response
   */
  async function call(method, path, req = {}) {
    const methodLc = method.toLowerCase();
    let matched = null;
    let extractedParams = {};
    for (const route of routes) {
      if (route.method !== methodLc) continue;
      const m = route.regex.exec(path);
      if (m) {
        matched = route;
        route.paramNames.forEach((name, i) => {
          extractedParams[name] = m[i + 1];
        });
        break;
      }
    }
    if (!matched) throw new Error(`No route registered for ${methodLc} ${path}`);

    const request = {
      body: req.body || {},
      params: { ...extractedParams, ...req.params },
      query: req.query || {},
      header: (name) => (req.headers || {})[name] || "Bearer test-key",
      file: req.file,
      ip: req.ip || "127.0.0.1",
      on: jest.fn(),
      randomFileName: req.randomFileName,
    };
    const response = createMockRes(req.locals || {});
    await matched.handler(request, response);
    return response;
  }

  return { app, call, routes };
}

module.exports = { createMockApp, createMockRes };
