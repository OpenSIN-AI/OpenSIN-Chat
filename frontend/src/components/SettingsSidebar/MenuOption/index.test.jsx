// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MenuOption from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});

vi.mock("react-router-dom", () => ({
  Link: ({ children, to, onClick, ...props }) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: "/settings/general" }),
}));

vi.mock("@/utils/request", () => ({
  safeJsonParse: vi.fn((val, fallback) => {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }),
}));

vi.mock("@/utils/paths", () => ({
  isPathMatch: vi.fn(
    (href, pathname) => pathname === href || pathname.startsWith(href + "/"),
  ),
}));

vi.mock("@/hooks/useScrollActiveItemIntoView", () => ({
  default: () => ({ ref: { current: null } }),
}));

vi.mock("@phosphor-icons/react/dist/csr/House", () => ({
  default: (props) => <svg data-testid="phosphor-house-icon" {...props} />,
  House: (props) => <svg data-testid="phosphor-house-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/List", () => ({
  default: (props) => <svg data-testid="phosphor-list-icon" {...props} />,
  List: (props) => <svg data-testid="phosphor-list-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Flask", () => ({
  default: (props) => <svg data-testid="phosphor-flask-icon" {...props} />,
  Flask: (props) => <svg data-testid="phosphor-flask-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Gear", () => ({
  default: (props) => <svg data-testid="phosphor-gear-icon" {...props} />,
  Gear: (props) => <svg data-testid="phosphor-gear-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/UserCircleGear", () => ({
  default: (props) => (
    <svg data-testid="phosphor-usercirclegear-icon" {...props} />
  ),
  UserCircleGear: (props) => (
    <svg data-testid="phosphor-usercirclegear-icon" {...props} />
  ),
}));
vi.mock("@phosphor-icons/react/dist/csr/PencilSimpleLine", () => ({
  default: (props) => (
    <svg data-testid="phosphor-pencilsimpleline-icon" {...props} />
  ),
  PencilSimpleLine: (props) => (
    <svg data-testid="phosphor-pencilsimpleline-icon" {...props} />
  ),
}));
vi.mock("@phosphor-icons/react/dist/csr/Nut", () => ({
  default: (props) => <svg data-testid="phosphor-nut-icon" {...props} />,
  Nut: (props) => <svg data-testid="phosphor-nut-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Toolbox", () => ({
  default: (props) => <svg data-testid="phosphor-toolbox-icon" {...props} />,
  Toolbox: (props) => <svg data-testid="phosphor-toolbox-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/Plugs", () => ({
  default: (props) => <svg data-testid="phosphor-plugs-icon" {...props} />,
  Plugs: (props) => <svg data-testid="phosphor-plugs-icon" {...props} />,
}));
vi.mock("@phosphor-icons/react/dist/csr/CaretRight", () => ({
  default: (props) => <svg data-testid="caret-right-icon" {...props} />,
  CaretRight: (props) => <svg data-testid="caret-right-icon" {...props} />,
}));

describe("MenuOption", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders button text when flex=true and no user", () => {
    render(
      <MenuOption btnText="General" href="/settings/general" flex={true} />,
    );
    expect(screen.getByText("General")).toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    render(
      <MenuOption
        btnText="General"
        href="/settings/general"
        icon={<span data-testid="custom-icon">IC</span>}
        flex={true}
      />,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("returns null when hidden is true", () => {
    const { container } = render(
      <MenuOption
        btnText="Hidden"
        href="/settings/hidden"
        hidden={true}
        flex={true}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null when user role not in roles and not flex", () => {
    const { container } = render(
      <MenuOption
        btnText="Admin"
        href="/settings/admin"
        roles={["admin"]}
        user={{ role: "member" }}
        flex={false}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders when user role matches roles", () => {
    render(
      <MenuOption
        btnText="Admin"
        href="/settings/admin"
        roles={["admin"]}
        user={{ role: "admin" }}
        flex={false}
      />,
    );
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders when flex is true and no user", () => {
    render(
      <MenuOption
        btnText="Flex"
        href="/settings/flex"
        flex={true}
        user={null}
      />,
    );
    expect(screen.getByText("Flex")).toBeInTheDocument();
  });

  it("returns null when flex=true, user exists, and role not in roles", () => {
    const { container } = render(
      <MenuOption
        btnText="Flex"
        href="/settings/flex"
        flex={true}
        user={{ role: "member" }}
        roles={["admin"]}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders expand arrow when childOptions are provided", () => {
    render(
      <MenuOption
        btnText="Parent"
        href="/settings/parent"
        childOptions={[
          { btnText: "Child", href: "/settings/child", flex: true },
        ]}
        flex={true}
      />,
    );
    expect(screen.getByTestId("caret-right-icon")).toBeInTheDocument();
  });

  it("toggles expansion on click when has children", () => {
    render(
      <MenuOption
        btnText="Parent"
        href="/settings/parent"
        childOptions={[
          { btnText: "Child", href: "/settings/child", flex: true },
        ]}
        flex={true}
      />,
    );
    expect(screen.queryByText("Child")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("caret-right-icon"));
    expect(screen.getByText("Child")).toBeInTheDocument();
  });

  it("collapses expanded children on second click", () => {
    render(
      <MenuOption
        btnText="Parent"
        href="/settings/parent"
        childOptions={[
          { btnText: "Child", href: "/settings/child", flex: true },
        ]}
        flex={true}
      />,
    );
    fireEvent.click(screen.getByTestId("caret-right-icon"));
    expect(screen.getByText("Child")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("caret-right-icon"));
    expect(screen.queryByText("Child")).not.toBeInTheDocument();
  });

  it("renders as child option with smaller text", () => {
    render(
      <MenuOption
        btnText="Child Item"
        href="/settings/child"
        isChild={true}
        flex={true}
      />,
    );
    const textEl = screen.getByText("Child Item");
    expect(textEl.className).toContain("text-xs");
  });

  it("renders parent option with regular text", () => {
    render(
      <MenuOption
        btnText="Parent Item"
        href="/settings/parent"
        isChild={false}
        flex={true}
      />,
    );
    const textEl = screen.getByText("Parent Item");
    expect(textEl.className).toContain("text-sm");
  });

  it("returns null when has children but no visible children", () => {
    const { container } = render(
      <MenuOption
        btnText="Parent"
        href="/settings/parent"
        childOptions={[
          {
            btnText: "Child",
            href: "/settings/child",
            flex: false,
            roles: ["admin"],
            hidden: true,
          },
        ]}
        flex={true}
        user={{ role: "member" }}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("auto-expands when a child matches current path", () => {
    render(
      <MenuOption
        btnText="Parent"
        href="/settings/parent"
        childOptions={[
          { btnText: "General", href: "/settings/general", flex: true },
        ]}
        flex={true}
      />,
    );
    expect(screen.getByText("General")).toBeInTheDocument();
  });
});
