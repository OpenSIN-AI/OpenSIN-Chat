// SPDX-License-Identifier: MIT
const {
  chatHistoryViewable,
} = require("../../../utils/middleware/chatHistoryViewable");

describe("chatHistoryViewable middleware", () => {
  const originalValue = process.env.DISABLE_VIEW_CHAT_HISTORY;
  const hadValue = "DISABLE_VIEW_CHAT_HISTORY" in process.env;

  afterEach(() => {
    if (hadValue) {
      process.env.DISABLE_VIEW_CHAT_HISTORY = originalValue;
    } else {
      delete process.env.DISABLE_VIEW_CHAT_HISTORY;
    }
  });

  it("calls next when DISABLE_VIEW_CHAT_HISTORY is not set", () => {
    delete process.env.DISABLE_VIEW_CHAT_HISTORY;
    const next = jest.fn();

    chatHistoryViewable({}, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 422 when DISABLE_VIEW_CHAT_HISTORY is set with any value", () => {
    process.env.DISABLE_VIEW_CHAT_HISTORY = "1";
    const next = jest.fn();
    const response = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    chatHistoryViewable({}, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(422);
    expect(response.send).toHaveBeenCalledWith(
      "This feature has been disabled by the administrator."
    );
  });

  it("restores env var after test", () => {
    delete process.env.DISABLE_VIEW_CHAT_HISTORY;
    process.env.DISABLE_VIEW_CHAT_HISTORY = "true";

    chatHistoryViewable({}, { status: jest.fn().mockReturnThis(), send: jest.fn() }, jest.fn());

    delete process.env.DISABLE_VIEW_CHAT_HISTORY;

    expect("DISABLE_VIEW_CHAT_HISTORY" in process.env).toBe(false);
  });
});
