// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StatusResponse from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@/media/animations/agent-animation.webm", () => ({
  default: "agent-animation.webm",
}));
vi.mock("@/media/animations/agent-static.png", () => ({
  default: "agent-static.png",
}));

describe("StatusResponse", () => {
  it("returns null when there are no messages and not thinking", () => {
    const { container } = render(<StatusResponse messages={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the thinking shimmer when pending", () => {
    render(
      <StatusResponse
        messages={[{ uuid: "1", content: "Thinking..." }]}
        isThinking={true}
      />,
    );
    expect(document.querySelector(".thinking-shimmer")).toBeInTheDocument();
  });

  it("renders the latest status text when not thinking", () => {
    render(
      <StatusResponse
        messages={[{ uuid: "1", content: "Done" }]}
        isThinking={false}
      />,
    );
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows the current thought content", () => {
    render(
      <StatusResponse
        messages={[
          { uuid: "1", content: "First thought" },
          { uuid: "2", content: "Latest thought" },
        ]}
        isThinking={false}
      />,
    );
    expect(screen.getAllByText("Latest thought")).not.toHaveLength(0);
  });

  it("expands to show all previous thoughts when expand button is clicked", () => {
    render(
      <StatusResponse
        messages={[
          { uuid: "1", content: "First thought" },
          { uuid: "2", content: "Latest thought" },
        ]}
        isThinking={false}
      />,
    );
    const expandButton = screen.getByRole("button", {
      name: /show thought chain/i,
    });
    fireEvent.click(expandButton);
    expect(screen.getByText("First thought")).toBeInTheDocument();
    expect(screen.getAllByText("Latest thought")).not.toHaveLength(0);
  });

  it("does not render expand button when there are no previous thoughts", () => {
    render(
      <StatusResponse
        messages={[{ uuid: "1", content: "Only thought" }]}
        isThinking={false}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /thought chain/i }),
    ).not.toBeInTheDocument();
  });
});
