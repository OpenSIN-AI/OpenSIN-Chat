// SPDX-License-Identifier: MIT
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PasswordGate from "./PasswordGate";

// Mock the children to avoid rendering the full app
const mockChildren = <div data-testid="protected-content">Protected Content</div>;

afterEach(cleanup);

describe("PasswordGate", () => {
  it("renders password input initially", () => {
    render(<PasswordGate>{mockChildren}</PasswordGate>);
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Zugang erhalten/i })).toBeInTheDocument();
  });

  it("does not render protected content before authentication", () => {
    render(<PasswordGate>{mockChildren}</PasswordGate>);
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("renders protected content with correct password", async () => {
    const user = userEvent.setup();
    render(<PasswordGate>{mockChildren}</PasswordGate>);

    const input = screen.getByPlaceholderText("Password");
    const button = screen.getByRole("button", { name: /Zugang erhalten/i });

    await user.type(input, "Simone123");
    await user.click(button);

    expect(await screen.findByTestId("protected-content")).toBeInTheDocument();
  });

  it("shows error with incorrect password", async () => {
    const user = userEvent.setup();
    render(<PasswordGate>{mockChildren}</PasswordGate>);

    const input = screen.getByPlaceholderText("Password");
    const button = screen.getByRole("button", { name: /Zugang erhalten/i });

    await user.type(input, "WrongPassword");
    await user.click(button);

    expect(screen.getByText(/Ungültiges Passwort/i)).toBeInTheDocument();
  });

  it("renders professional UI structure", () => {
    const { container } = render(<PasswordGate>{mockChildren}</PasswordGate>);
    const card = container.querySelector(".rounded-2xl");
    expect(card).toBeInTheDocument();
    
    expect(screen.getByText("OpenAfD Chat")).toBeInTheDocument();
    expect(screen.getByText(/Demo-Zugang/i)).toBeInTheDocument();
  });
});
