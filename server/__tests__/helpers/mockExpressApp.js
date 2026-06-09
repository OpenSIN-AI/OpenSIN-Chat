// SPDX-License-Identifier: MIT
/**
 * Minimal Express-compatible test harness for exercising REST endpoint
 * registration functions (e.g. apiResearchEndpoints(app)) without booting a
 * real HTTP server. Middleware arrays are ignored — auth middleware is mocked
 * separately in the test files — and the final handler is captured per route.
 *
 * Supports:
 * - Express-style route params (e.g. /system/api-key/:id)
 * - locals in call options
 * - flushHeaders(), writeHead(), sendStatus() return res (chainable)
 * - file, on, randomFileName in request
 *
 * Not a test suite itself (no .test.js suffix), so Jest will not execute it.
 */

function createMockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    headers: {},
    ended: false,
    locals: {},
    _chunks: [],
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
  res.flushHeaders = () => res;
  res.writeHead = (code, headers) => {
    res.statusCode = code;
    if (headers) Object.assign(res.headers, headers);
    return res;
  };
  res.write = (chunk) => {
    res._chunks.push(chunk);
    return res;
  };
  res.end = (data) => {
    if (data) res._chunks.push(data);
    res.ended = true;
    return res;
  };
  return res;
}

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

  function matchRoute(method, path) {
    const methodLower = method.toLowerCase();
    const exactKey = `${methodLower} ${path}`;
    if (routes[exactKey]) return { handler: routes[exactKey], params: {} };

    for (const [key, fn] of Object.entries(routes)) {
      const spaceIdx = key.indexOf(" ");
      const routeMethod = key.substring(0, spaceIdx);
      const routePath = key.substring(spaceIdx + 1);
      if (routeMethod !== methodLower) continue;

      const routeParts = routePath.split("/");
      const pathParts = path.split("/");
      if (routeParts.length !== pathParts.length) continue;

      let match = true;
      const params = {};
      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(":")) {
          params[routeParts[i].substring(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          match = false;
          break;
        }
      }
      if (match) return { handler: fn, params };
    }
    return null;
  }

  async function call(method, path, req = {}) {
    const result = matchRoute(method, path);
    if (!result) throw new Error(`No route registered for ${method.toLowerCase()} ${path}`);
    const { handler, params } = result;
    const request = {
      body: req.body || {},
      params: { ...params, ...(req.params || {}) },
      query: req.query || {},
      headers: req.headers || {},
      header: (name) => (req.headers || {})[name] || "Bearer test-key",
      file: req.file || undefined,
      on: req.on || jest.fn(),
      randomFileName: req.randomFileName || undefined,
    };
    const response = createMockRes();
    if (req.locals) Object.assign(response.locals, req.locals);
    await handler(request, response);
    return response;
  }

  return { app, call, routes };
}

module.exports = { createMockApp, createMockRes };
