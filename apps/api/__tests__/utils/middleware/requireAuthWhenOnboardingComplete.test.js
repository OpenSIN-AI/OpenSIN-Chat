// SPDX-License-Identifier: MIT
jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: { isOnboardingComplete: jest.fn() },
}));
jest.mock("../../../utils/middleware/validatedRequest", () => ({
  validatedRequest: jest.fn((_req, _res, next) => next()),
}));

const { SystemSettings } = require("../../../models/systemSettings");
const { validatedRequest } = require("../../../utils/middleware/validatedRequest");
const {
  requireAuthWhenOnboardingComplete,
} = require("../../../utils/middleware/requireAuthWhenOnboardingComplete");

function createMockRes() {
  return {
    statusCode: 200,
    ended: false,
    sendStatus(code) {
      this.statusCode = code;
      this.ended = true;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return {
        json: () => this,
        end: () => {
          this.ended = true;
          return this;
        },
      };
    },
  };
}

describe("requireAuthWhenOnboardingComplete", () => {
  let request;
  let response;
  let next;

  beforeEach(() => {
    request = {};
    response = createMockRes();
    next = jest.fn();
    SystemSettings.isOnboardingComplete.mockReset();
    validatedRequest.mockReset();
    validatedRequest.mockImplementation((_req, _res, _next) => _next());
  });

  it("calls next without auth when onboarding is incomplete", async () => {
    SystemSettings.isOnboardingComplete.mockResolvedValue(false);
    await requireAuthWhenOnboardingComplete(request, response, next);
    expect(next).toHaveBeenCalled();
    expect(validatedRequest).not.toHaveBeenCalled();
    expect(response.ended).toBe(false);
  });

  it("delegates to validatedRequest when onboarding is complete", async () => {
    SystemSettings.isOnboardingComplete.mockResolvedValue(true);
    await requireAuthWhenOnboardingComplete(request, response, next);
    expect(validatedRequest).toHaveBeenCalledWith(request, response, next);
    expect(next).toHaveBeenCalled();
  });

  it("returns 500 when SystemSettings.isOnboardingComplete throws", async () => {
    SystemSettings.isOnboardingComplete.mockRejectedValue(new Error("db fail"));
    await requireAuthWhenOnboardingComplete(request, response, next);
    expect(response.statusCode).toBe(500);
    expect(response.ended).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });

  it("lets validatedRequest reject the request when onboarding is complete", async () => {
    SystemSettings.isOnboardingComplete.mockResolvedValue(true);
    validatedRequest.mockImplementation((_req, res) => res.status(401).json().end());
    await requireAuthWhenOnboardingComplete(request, response, next);
    expect(validatedRequest).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
    expect(response.ended).toBe(true);
  });
});
