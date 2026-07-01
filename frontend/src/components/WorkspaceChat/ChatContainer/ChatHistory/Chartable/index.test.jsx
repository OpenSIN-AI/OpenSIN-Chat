// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { Chartable } from "./index";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});
vi.mock("uuid", () => ({ v4: () => "test-uuid-1234" }));

vi.mock("echarts-for-react", () => ({
  default: ({ option }) => (
    <div data-testid="echart-renderer" data-chart-type={option?.series?.[0]?.type ?? "unknown"}>
      {option?.title?.text && <span data-testid="echart-title">{option.title.text}</span>}
    </div>
  ),
}));

vi.mock("@/hooks/useTheme", () => ({
  resolveDarkMode: () => true,
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

vi.mock("@/utils/chat/markdown.ts", () => ({
  default: (text) => text ?? "",
}));

vi.mock("@/utils/chat/purify", () => ({
  default: { sanitize: (s) => s ?? "" },
}));

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

vi.mock("@phosphor-icons/react/dist/csr/CircleNotch", () => ({
  default: (props) => (
    <svg data-testid="phosphor-circlenotch-icon" {...props} />
  ),
  CircleNotch: (props) => (
    <svg data-testid="phosphor-circlenotch-icon" {...props} />
  ),
}));
vi.mock("@phosphor-icons/react/dist/csr/DownloadSimple", () => ({
  default: (props) => (
    <svg data-testid="phosphor-downloadsimple-icon" {...props} />
  ),
  DownloadSimple: (props) => (
    <svg data-testid="phosphor-downloadsimple-icon" {...props} />
  ),
}));

const sampleDataset = [
  { name: "A", value: 10 },
  { name: "B", value: 20 },
];

function makeProps(type, dataset = sampleDataset, extra = {}) {
  return {
    props: {
      content: { type, dataset, title: "Test Chart", ...extra },
      chatId: null,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Chartable (ECharts)", () => {
  it("returns null when content is null after parse", () => {
    const { container } = render(
      <Chartable props={{ content: "not-json-at-all" }} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders area chart via ECharts", () => {
    render(<Chartable {...makeProps("area")} />);
    expect(screen.getByTestId("echart-renderer")).toBeInTheDocument();
    expect(screen.getByTestId("echart-title")).toHaveTextContent("Test Chart");
  });

  it("renders bar chart via ECharts", () => {
    render(<Chartable {...makeProps("bar")} />);
    expect(screen.getByTestId("echart-renderer")).toBeInTheDocument();
  });

  it("renders line chart via ECharts", () => {
    render(<Chartable {...makeProps("line")} />);
    expect(screen.getByTestId("echart-renderer")).toBeInTheDocument();
  });

  it("renders pie chart via ECharts", () => {
    render(<Chartable {...makeProps("pie")} />);
    expect(screen.getByTestId("echart-renderer")).toBeInTheDocument();
  });

  it("renders scatter chart via ECharts", () => {
    render(<Chartable {...makeProps("scatter")} />);
    expect(screen.getByTestId("echart-renderer")).toBeInTheDocument();
  });

  it("renders radar chart via ECharts", () => {
    render(<Chartable {...makeProps("radar")} />);
    expect(screen.getByTestId("echart-renderer")).toBeInTheDocument();
  });

  it("renders treemap chart via ECharts", () => {
    render(<Chartable {...makeProps("treemap")} />);
    expect(screen.getByTestId("echart-renderer")).toBeInTheDocument();
  });

  it("renders funnel chart via ECharts", () => {
    render(<Chartable {...makeProps("funnel")} />);
    expect(screen.getByTestId("echart-renderer")).toBeInTheDocument();
  });

  it("renders download button", () => {
    render(<Chartable {...makeProps("area")} />);
    expect(screen.getByLabelText("Download graph")).toBeInTheDocument();
  });

  it("renders caption when provided", () => {
    render(
      <Chartable
        {...makeProps("area", sampleDataset, { caption: "My caption" })}
      />,
    );
    expect(screen.getByText("My caption")).toBeInTheDocument();
  });

  it("renders with chatId present", () => {
    const props = {
      props: {
        content: { type: "area", dataset: sampleDataset, title: "Chat Chart" },
        chatId: "abc-123",
      },
    };
    render(<Chartable {...props} />);
    expect(screen.getByTestId("echart-title")).toHaveTextContent("Chat Chart");
  });

  it("handles dataset as JSON string", () => {
    render(
      <Chartable
        props={{
          content: {
            type: "bar",
            dataset: JSON.stringify(sampleDataset),
            title: "Parsed Chart",
          },
        }}
      />,
    );
    expect(screen.getByTestId("echart-renderer")).toBeInTheDocument();
    expect(screen.getByTestId("echart-title")).toHaveTextContent("Parsed Chart");
  });

  it("renders the caption inside the chat container when chatId is present", () => {
    const props = {
      props: {
        content: {
          type: "area",
          dataset: sampleDataset,
          title: "Chat Chart",
          caption: "Chat caption",
        },
        chatId: "abc-123",
      },
    };
    render(<Chartable {...props} />);
    expect(screen.getByTestId("echart-title")).toHaveTextContent("Chat Chart");
    expect(screen.getByText("Chat caption")).toBeInTheDocument();
  });

  it("returns null for empty dataset", () => {
    const { container } = render(
      <Chartable props={{ content: { type: "bar", dataset: [], title: "Empty" } }} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders multi-series bar chart", () => {
    const multiSeries = [
      { name: "Jan", AfD: 45, CDU: 62 },
      { name: "Feb", AfD: 38, CDU: 55 },
    ];
    render(<Chartable {...makeProps("bar", multiSeries)} />);
    expect(screen.getByTestId("echart-renderer")).toBeInTheDocument();
  });
});
