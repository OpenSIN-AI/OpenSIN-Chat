// SPDX-License-Identifier: MIT
/* eslint-env jest */

const {
  STREAM_EDIT_INTERVAL,
  MAX_MSG_LEN,
  CURSOR_CHAR,
} = require("../../../utils/telegramBot/constants");

describe("STREAM_EDIT_INTERVAL", () => {
  test("is 1200", () => {
    expect(STREAM_EDIT_INTERVAL).toBe(1200);
  });
});

describe("MAX_MSG_LEN", () => {
  test("is 4000", () => {
    expect(MAX_MSG_LEN).toBe(4000);
  });
});

describe("CURSOR_CHAR", () => {
  test("contains the block character", () => {
    expect(CURSOR_CHAR).toContain("\u258d");
  });
});
