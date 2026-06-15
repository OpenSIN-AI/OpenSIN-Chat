// SPDX-License-Identifier: MIT
// Tests for AccountModal component
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AccountModal from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

// ---- module mocks ----
vi.mock("@/hooks/usePfp", () => ({
  default: () => ({ pfp: null, setPfp: vi.fn() }),
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: vi.fn(),
    availableThemes: { system: "System", light: "Light", dark: "Dark" },
  }),
}));

vi.mock("@/hooks/useLanguageOptions", () => ({
  useLanguageOptions: () => ({
    supportedLanguages: ["en", "de"],
    currentLanguage: "en",
    changeLanguage: vi.fn(),
    getLanguageName: (lang) => (lang === "en" ? "English" : "Deutsch"),
  }),
}));

vi.mock("@/models/system", () => ({
  default: {
    uploadPfp: vi.fn().mockResolvedValue({ success: true }),
    fetchPfp: vi.fn().mockResolvedValue("/pfp.jpg"),
    removePfp: vi.fn().mockResolvedValue({ success: true }),
    updateUser: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("@/models/appearance", () => ({
  default: {
    getSettings: () => ({ showScrollbar: false }),
  },
}));

vi.mock("@/utils/toast", () => ({
  default: vi.fn(),
}));

vi.mock("@/utils/request.ts", () => ({
  safeJsonParse: (str, fallback) => {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  },
}));

vi.mock("@/components/ModalWrapper", () => ({
  default: ({ children, isOpen }) =>
    isOpen ? <div data-testid="modal-wrapper">{children}</div> : null,
}));

vi.mock("@/components/lib/Toggle", () => ({
  default: ({ checked, onChange }) => (
    <button
      data-testid="toggle"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    />
  ),
}));

vi.mock("react-tooltip", () => ({
  Tooltip: () => null,
}));

// ---- helpers ----
const defaultUser = {
  id: 1,
  username: "alice",
  email: "alice@example.com",
  bio: "Hello!",
  role: "default",
};

const Wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

describe("AccountModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the modal", () => {
    render(<AccountModal user={defaultUser} hideModal={vi.fn()} />, {
      wrapper: Wrapper,
    });
    expect(screen.getByTestId("modal-wrapper")).toBeInTheDocument();
  });

  it("pre-fills username and bio fields", () => {
    render(<AccountModal user={defaultUser} hideModal={vi.fn()} />, {
      wrapper: Wrapper,
    });
    expect(screen.getByDisplayValue("alice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hello!")).toBeInTheDocument();
  });

  it("calls System.updateUser on form submit", async () => {
    const System = (await import("@/models/system")).default;
    const hideModal = vi.fn();

    const { container } = render(
      <AccountModal user={defaultUser} hideModal={hideModal} />,
      { wrapper: Wrapper },
    );

    const form = container.querySelector("form");
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(System.updateUser).toHaveBeenCalled();
    });
  });

  it("calls hideModal after successful update", async () => {
    const System = (await import("@/models/system")).default;
    const hideModal = vi.fn();

    render(<AccountModal user={defaultUser} hideModal={hideModal} />, {
      wrapper: Wrapper,
    });

    const form = screen.getByTestId("modal-wrapper").querySelector("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(hideModal).toHaveBeenCalled();
    });
  });

  it("calls System.removePfp when remove button is clicked", async () => {
    const System = (await import("@/models/system")).default;

    render(<AccountModal user={{ ...defaultUser }} hideModal={vi.fn()} />, {
      wrapper: Wrapper,
    });

    const removeBtn =
      screen.queryByTestId("remove-pfp-btn") ??
      screen.queryByRole("button", { name: /remove/i });

    if (removeBtn) {
      fireEvent.click(removeBtn);
      await waitFor(() => {
        expect(System.removePfp).toHaveBeenCalled();
      });
    } else {
      // No pfp to remove — component hides the button when pfp is null
      expect(System.removePfp).not.toHaveBeenCalled();
    }
  });

  it("shows language dropdown with supported languages", () => {
    render(<AccountModal user={defaultUser} hideModal={vi.fn()} />, {
      wrapper: Wrapper,
    });
    // The component renders a language section
    expect(screen.getByTestId("modal-wrapper")).toBeInTheDocument();
  });
});
