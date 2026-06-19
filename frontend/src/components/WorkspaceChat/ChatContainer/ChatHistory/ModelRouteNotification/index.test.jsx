// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ModelRouteNotification from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("@phosphor-icons/react/dist/csr/ArrowDown", () => ({
  default: (props) => <svg data-testid="phosphor-arrowdown-icon" {...props} />,
  ArrowDown: (props) => (
    <svg data-testid="phosphor-arrowdown-icon" {...props} />
  ),
}));
vi.mock("@phosphor-icons/react/dist/csr/Shuffle", () => ({
  default: (props) => <svg data-testid="shuffle-icon" {...props} />,
  Shuffle: (props) => <svg data-testid="shuffle-icon" {...props} />,
}));

vi.mock("@/media/animations/router-animation.webm", () => ({
  default: "router-animation.webm",
}));

describe("ModelRouteNotification", () => {
  it("returns null when routedTo is not provided", () => {
    const { container } = render(<ModelRouteNotification routedTo={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the routed container when routedTo is provided", () => {
    const { container } = render(
      <ModelRouteNotification
        routedTo={{ model: "gpt-4", routerName: "My Router" }}
        isStreaming={false}
      />,
    );
    expect(container.querySelector(".rounded-\\[20px\\]")).toBeInTheDocument();
  });

  it("renders the static icon when not streaming", () => {
    render(
      <ModelRouteNotification
        routedTo={{ model: "gpt-4", routerName: "My Router" }}
        isStreaming={false}
      />,
    );
    expect(screen.getByTestId("shuffle-icon")).toBeInTheDocument();
  });

  it("renders the animated icon when streaming", () => {
    const { container } = render(
      <ModelRouteNotification
        routedTo={{ model: "gpt-4", routerName: "My Router" }}
        isStreaming={true}
      />,
    );
    expect(container.querySelector("video")).toBeInTheDocument();
  });

  it("renders the rule route variant when ruleTitle is provided", () => {
    const { container } = render(
      <ModelRouteNotification
        routedTo={{
          model: "gpt-4",
          routerName: "My Router",
          ruleTitle: "Code Rule",
        }}
        isStreaming={false}
      />,
    );
    expect(container.querySelector(".rounded-\\[20px\\]")).toBeInTheDocument();
  });
});
