// SPDX-License-Identifier: MIT
/* eslint-disable i18next/no-literal-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chartable } from "./index";

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

vi.mock("./chart-utils.js", () => ({
  Colors: { blue: "#3b82f6" },
  getTremorColor: (c) => "#3b82f6",
}));

vi.mock("./CustomCell.jsx", () => ({
  default: () => <div>CustomCell</div>,
}));

vi.mock("./CustomTooltip.jsx", () => ({
  default: (props) => <div>Tooltip</div>,
}));

vi.mock("@/utils/request.js", () => ({
  safeJsonParse: (str, fallback) => {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  },
}));

vi.mock("@/utils/chat/markdown.js", () => ({
  default: (text) => text ?? "",
}));

vi.mock("dompurify", () => ({
  default: { sanitize: (s) => s ?? "" },
}));

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

vi.mock("recharts-to-png", () => ({
  useGenerateImage: () => [
    vi.fn(async () => "blob"),
    { ref: { current: document.createElement("div") } },
  ],
}));

vi.mock("@phosphor-icons/react", () => ({
  CircleNotch: ({ className }) => <span className={className}>Notch</span>,
  DownloadSimple: ({ onClick, className }) => (
    <span onClick={onClick} className={className}>
      Download
    </span>
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

{/* eslint-disable i18next/no-literal-string */}
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
});
{/* eslint-enable i18next/no-literal-string */}
