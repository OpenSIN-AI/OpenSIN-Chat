// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

// Mock System.markOnboardingComplete so the "Weiter" button doesn't hit the
// real API. We return a resolved promise so navigate() runs in the .finally()
// callback of handleForward.
vi.mock("@/models/system", () => ({
  default: {
    markOnboardingComplete: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("@/components/ProviderPrivacy", () => ({
  default: () => <div data-testid="provider-privacy-mock" />,
}));


const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

import System from "@/models/system";
import DataHandling from "../index";

// ESM equivalent of __dirname so we can read the source file for the static
// import check. See issue #101.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function renderDataHandling() {
  const setHeader = vi.fn();
  const setForwardBtn = vi.fn();
  const setBackBtn = vi.fn();
  render(
    <DataHandling
      setHeader={setHeader}
      setForwardBtn={setForwardBtn}
      setBackBtn={setBackBtn}
    />,
  );
  return { setHeader, setForwardBtn, setBackBtn };
}

describe("DataHandling step (issue #101 regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockClear();
  });

  it("imports the System model so the 'Weiter' button does not throw ReferenceError", () => {
    // Static check: read the source of the component and assert that it
    // imports System. This is the literal root cause of issue #101 — the
    // handler called System.markOnboardingComplete() without ever importing
    // System, throwing ReferenceError at click time. If anyone removes the
    // import again, this test fails before the runtime tests even run.
    const source = readFileSync(resolve(__dirname, "..", "index.jsx"), "utf8");
    expect(source).toMatch(
      /import\s+System\s+from\s+["']@\/models\/system["']/,
    );
  });

  it("registers the forward button on mount with a working onClick handler", () => {
    const { setForwardBtn } = renderDataHandling();
    expect(setForwardBtn).toHaveBeenCalledTimes(1);

    const forwardConfig = setForwardBtn.mock.calls[0][0];
    expect(forwardConfig).toMatchObject({ showing: true, disabled: false });
    expect(typeof forwardConfig.onClick).toBe("function");
  });

  it("calls System.markOnboardingComplete when the forward button is clicked", () => {
    const { setForwardBtn } = renderDataHandling();
    const { onClick } = setForwardBtn.mock.calls[0][0];
    onClick();
    expect(System.markOnboardingComplete).toHaveBeenCalledTimes(1);
  });

  it("navigates to the home path after onboarding is marked complete", async () => {
    const { setForwardBtn } = renderDataHandling();
    const { onClick } = setForwardBtn.mock.calls[0][0];
    onClick();

    // The component chains navigate(paths.home()) inside .finally(), so it
    // runs asynchronously after the mocked promise resolves.
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/");
    });
  });
});
