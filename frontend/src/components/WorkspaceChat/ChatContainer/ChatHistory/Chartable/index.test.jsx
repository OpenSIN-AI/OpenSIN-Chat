// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Chartable } from "./index";
import { saveAs } from "file-saver";

vi.mock("react-i18next", async () => {
  const { createI18nMock } = await import("@/test/i18nMock");
  return createI18nMock();
});
vi.mock("uuid", () => ({ v4: () => "test-uuid-1234" }));

vi.mock("@tremor/react", () => ({
  AreaChart: ({ data, index }) => (
    <div data-testid="area-chart">{`AreaChart:${data?.length}:${index}`}</div>
  ),
  BarChart: ({ data, index }) => (
    <div data-testid="bar-chart">{`BarChart:${data?.length}:${index}`}</div>
  ),
  LineChart: ({ data, index }) => (
    <div data-testid="line-chart">{`LineChart:${data?.length}:${index}`}</div>
  ),
  DonutChart: ({ data, category }) => (
    <div data-testid="donut-chart">{`DonutChart:${data?.length}:${category}`}</div>
  ),
  Legend: ({ categories }) => (
    <div data-testid="legend">{categories?.join(",")}</div>
  ),
}));

vi.mock("recharts", () => ({
  ComposedChart: ({ children }) => (
    <div data-testid="composed-chart">{children}</div>
  ),
  ScatterChart: ({ children }) => (
    <div data-testid="scatter-chart">{children}</div>
  ),
  RadarChart: ({ children }) => <div data-testid="radar-chart">{children}</div>,
  RadialBarChart: ({ children }) => (
    <div data-testid="radialbar-chart">{children}</div>
  ),
  Treemap: ({ children }) => <div data-testid="treemap">{children}</div>,
  FunnelChart: ({ children }) => (
    <div data-testid="funnel-chart">{children}</div>
  ),
  Bar: () => <div>Bar</div>,
  Line: () => <div>Line</div>,
  CartesianGrid: () => <div>Grid</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  Scatter: () => <div>Scatter</div>,
  Radar: () => <div>Radar</div>,
  RadialBar: () => <div>RadialBar</div>,
  PolarGrid: () => <div>PolarGrid</div>,
  PolarAngleAxis: () => <div>PolarAngleAxis</div>,
  PolarRadiusAxis: () => <div>PolarRadiusAxis</div>,
  Funnel: () => <div>Funnel</div>,
}));

vi.mock("./chart-utils.ts", () => ({
  Colors: { blue: "#3b82f6" },
  getTremorColor: (c) => "#3b82f6",
}));

vi.mock("./CustomCell.tsx", () => ({
  default: () => <div>CustomCell</div>,
}));

vi.mock("./CustomTooltip.tsx", () => ({
  default: (props) => <div>Tooltip</div>,
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

const mockGetDivJpeg = vi.fn(async () => "blob");

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

vi.mock("recharts-to-png", () => ({
  useGenerateImage: () => [
    mockGetDivJpeg,
    { ref: { current: document.createElement("div") } },
  ],
}));

vi.mock("@phosphor-icons/react/dist/csr/ArrowDown", () => ({ default: (props) => <svg data-testid="phosphor-arrowdown-icon" {...props} />, ArrowDown: (props) => <svg data-testid="phosphor-arrowdown-icon" {...props} /> }));
vi.mock("@phosphor-icons/react/dist/csr/CircleNotch", () => ({ default: (props) => <svg data-testid="phosphor-circlenotch-icon" {...props} />, CircleNotch: (props) => <svg data-testid="phosphor-circlenotch-icon" {...props} /> }));
vi.mock("@phosphor-icons/react/dist/csr/DownloadSimple", () => ({ default: (props) => <svg data-testid="phosphor-downloadsimple-icon" {...props} />, DownloadSimple: (props) => <svg data-testid="phosphor-downloadsimple-icon" {...props} /> }));;

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
  mockGetDivJpeg.mockResolvedValue("blob");
});

describe("Chartable", () => {
  it("returns null when content is null after parse", () => {
    const { container } = render(
      <Chartable props={{ content: "not-json-at-all" }} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders area chart", () => {
    render(<Chartable {...makeProps("area")} />);
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
    expect(screen.getByText("Test Chart")).toBeInTheDocument();
  });

  it("renders bar chart", () => {
    render(<Chartable {...makeProps("bar")} />);
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("renders line chart", () => {
    render(<Chartable {...makeProps("line")} />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("renders composed chart", () => {
    render(<Chartable {...makeProps("composed")} />);
    expect(screen.getByTestId("composed-chart")).toBeInTheDocument();
  });

  it("renders scatter chart", () => {
    render(<Chartable {...makeProps("scatter")} />);
    expect(screen.getByTestId("scatter-chart")).toBeInTheDocument();
  });

  it("renders pie/donut chart", () => {
    render(<Chartable {...makeProps("pie")} />);
    expect(screen.getByTestId("donut-chart")).toBeInTheDocument();
  });

  it("renders radar chart", () => {
    render(<Chartable {...makeProps("radar")} />);
    expect(screen.getByTestId("radar-chart")).toBeInTheDocument();
  });

  it("renders radialbar chart", () => {
    render(<Chartable {...makeProps("radialbar")} />);
    expect(screen.getByTestId("radialbar-chart")).toBeInTheDocument();
  });

  it("renders treemap chart", () => {
    render(<Chartable {...makeProps("treemap")} />);
    expect(screen.getByTestId("treemap")).toBeInTheDocument();
  });

  it("renders funnel chart", () => {
    render(<Chartable {...makeProps("funnel")} />);
    expect(screen.getByTestId("funnel-chart")).toBeInTheDocument();
  });

  it("renders unsupported message for unknown type", () => {
    render(<Chartable {...makeProps("unknown")} />);
    expect(screen.getByText("Unsupported chart type.")).toBeInTheDocument();
  });

  it("renders download button", () => {
    render(<Chartable {...makeProps("area")} />);
    expect(screen.getByText("Download")).toBeInTheDocument();
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
    expect(screen.getByText("Chat Chart")).toBeInTheDocument();
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
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    expect(screen.getByText("Parsed Chart")).toBeInTheDocument();
  });

  it("triggers download when the download button is clicked", async () => {
    const user = userEvent.setup();
    render(<Chartable {...makeProps("area")} />);
    await user.click(screen.getByText("Download"));
    await waitFor(() => expect(mockGetDivJpeg).toHaveBeenCalledTimes(1));
    expect(saveAs).toHaveBeenCalledWith(
      "blob",
      expect.stringMatching(/^chart-/),
    );
  });

  it("renders a loading spinner while downloading", async () => {
    const user = userEvent.setup();
    mockGetDivJpeg.mockImplementation(() => new Promise(() => {}));
    render(<Chartable {...makeProps("area")} />);
    await user.click(screen.getByText("Download"));
    await waitFor(() =>
      expect(screen.getByLabelText("Downloading chart...")).toBeInTheDocument(),
    );
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
    expect(screen.getByText("Chat Chart")).toBeInTheDocument();
    expect(screen.getByText("Chat caption")).toBeInTheDocument();
  });
});
