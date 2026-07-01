// SPDX-License-Identifier: MIT
// Purpose: SOTA ECharts renderer — maps legacy rechart.js {type, dataset, title}
// format to Apache ECharts options with gradients, glow, staggered animations.
// Docs: Mirrors sin-code image-graph visual quality. Dark/light theme adaptive.

import { memo, useMemo, useRef, useCallback, useState } from "react";
import ReactECharts from "echarts-for-react";
import { resolveDarkMode } from "@/hooks/useTheme";
import { v4 } from "uuid";
// @ts-expect-error - file-saver has no bundled types
import { saveAs } from "file-saver";
import { DownloadSimple } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { useTranslation } from "react-i18next";
import {
  SOTA_COLORS,
  FONT_FAMILY,
  getThemeColors,
  barGradient,
  areaGradient,
  GLOW_SHADOW,
  BAR_BORDER_RADIUS,
  ANIMATION_ELASTIC,
  ANIMATION_CUBIC,
  TOOLTIP_STYLE,
  TOOLBOX_FEATURE,
  TOOLBOX_STYLE,
  LEGEND_STYLE,
  TITLE_STYLE,
} from "./echartsTheme";

interface ChartData {
  type: string;
  dataset: any[];
  title: string;
  caption?: string;
  echartsOptions?: Record<string, any>;
}

function buildBarOption(
  data: any[],
  title: string,
  isDark: boolean,
  seriesNames?: string[],
) {
  const tc = getThemeColors(isDark);
  const hasMultipleSeries = seriesNames && seriesNames.length > 0;
  const categories = data.map((d) => d.name);

  if (hasMultipleSeries) {
    return {
      title: TITLE_STYLE(isDark, title),
      legend: LEGEND_STYLE(isDark),
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        ...TOOLTIP_STYLE(isDark),
      },
      toolbox: { feature: TOOLBOX_FEATURE, ...TOOLBOX_STYLE(isDark) },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: 90,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: categories,
        axisLine: { lineStyle: { color: tc.axisLine } },
        axisLabel: {
          color: tc.axisLabel,
          fontFamily: FONT_FAMILY,
          fontSize: 11,
          rotate: categories.length > 8 ? 25 : 0,
        },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: tc.axisLine } },
        axisLabel: {
          color: tc.axisLabel,
          fontFamily: FONT_FAMILY,
          fontSize: 11,
        },
        splitLine: {
          lineStyle: { color: tc.splitLine, type: "dashed" as const },
        },
      },
      series: seriesNames!.map((name, si) => ({
        name,
        type: "bar",
        data: data.map((d) => d[name] ?? d.value ?? 0),
        itemStyle: {
          color: barGradient(SOTA_COLORS[si % SOTA_COLORS.length], isDark),
          borderRadius: BAR_BORDER_RADIUS,
          ...GLOW_SHADOW,
        },
        emphasis: { focus: "series" as const },
        ...ANIMATION_ELASTIC,
      })),
    };
  }

  const valueKey = data[0]
    ? Object.keys(data[0]).find((k) => k !== "name") || "value"
    : "value";
  return {
    title: TITLE_STYLE(isDark, title),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      ...TOOLTIP_STYLE(isDark),
    },
    toolbox: { feature: TOOLBOX_FEATURE, ...TOOLBOX_STYLE(isDark) },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: 80,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLine: { lineStyle: { color: tc.axisLine } },
      axisLabel: {
        color: tc.axisLabel,
        fontFamily: FONT_FAMILY,
        fontSize: 11,
        rotate: categories.length > 8 ? 25 : 0,
      },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: tc.axisLine } },
      axisLabel: { color: tc.axisLabel, fontFamily: FONT_FAMILY, fontSize: 11 },
      splitLine: {
        lineStyle: { color: tc.splitLine, type: "dashed" as const },
      },
    },
    series: [
      {
        type: "bar",
        data: data.map((d) => d[valueKey]),
        itemStyle: {
          color: barGradient(SOTA_COLORS[0], isDark),
          borderRadius: BAR_BORDER_RADIUS,
          ...GLOW_SHADOW,
        },
        emphasis: { focus: "series" as const },
        ...ANIMATION_ELASTIC,
      },
    ],
  };
}

function buildLineOption(
  data: any[],
  title: string,
  isDark: boolean,
  seriesNames?: string[],
) {
  const tc = getThemeColors(isDark);
  const categories = data.map((d) => d.name);

  if (seriesNames && seriesNames.length > 0) {
    return {
      title: TITLE_STYLE(isDark, title),
      legend: LEGEND_STYLE(isDark),
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        ...TOOLTIP_STYLE(isDark),
      },
      toolbox: { feature: TOOLBOX_FEATURE, ...TOOLBOX_STYLE(isDark) },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: 90,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: categories,
        axisLine: { lineStyle: { color: tc.axisLine } },
        axisLabel: {
          color: tc.axisLabel,
          fontFamily: FONT_FAMILY,
          fontSize: 11,
        },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: tc.axisLine } },
        axisLabel: {
          color: tc.axisLabel,
          fontFamily: FONT_FAMILY,
          fontSize: 11,
        },
        splitLine: {
          lineStyle: { color: tc.splitLine, type: "dashed" as const },
        },
      },
      series: seriesNames.map((name, si) => {
        const color = SOTA_COLORS[si % SOTA_COLORS.length];
        return {
          name,
          type: "line",
          smooth: true,
          data: data.map((d) => d[name] ?? d.value ?? 0),
          lineStyle: {
            width: 3,
            color,
            shadowBlur: 12,
            shadowColor: color + "40",
          },
          symbol: "circle",
          symbolSize: 7,
          itemStyle: { color },
          emphasis: { focus: "series" as const },
          ...ANIMATION_CUBIC,
        };
      }),
    };
  }

  const valueKey = data[0]
    ? Object.keys(data[0]).find((k) => k !== "name") || "value"
    : "value";
  const color = SOTA_COLORS[0];
  return {
    title: TITLE_STYLE(isDark, title),
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      ...TOOLTIP_STYLE(isDark),
    },
    toolbox: { feature: TOOLBOX_FEATURE, ...TOOLBOX_STYLE(isDark) },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: 80,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: categories,
      axisLine: { lineStyle: { color: tc.axisLine } },
      axisLabel: { color: tc.axisLabel, fontFamily: FONT_FAMILY, fontSize: 11 },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: tc.axisLine } },
      axisLabel: { color: tc.axisLabel, fontFamily: FONT_FAMILY, fontSize: 11 },
      splitLine: {
        lineStyle: { color: tc.splitLine, type: "dashed" as const },
      },
    },
    series: [
      {
        type: "line",
        smooth: true,
        data: data.map((d) => d[valueKey]),
        lineStyle: {
          width: 3,
          color,
          shadowBlur: 12,
          shadowColor: color + "40",
        },
        symbol: "circle",
        symbolSize: 7,
        itemStyle: { color },
        ...ANIMATION_CUBIC,
      },
    ],
  };
}

function buildAreaOption(
  data: any[],
  title: string,
  isDark: boolean,
  seriesNames?: string[],
) {
  const lineOpt: any = buildLineOption(data, title, isDark, seriesNames);
  if (seriesNames && seriesNames.length > 0) {
    lineOpt.series = lineOpt.series.map((s: any, si: number) => ({
      ...s,
      areaStyle: { color: areaGradient(SOTA_COLORS[si % SOTA_COLORS.length]) },
    }));
  } else {
    lineOpt.series[0].areaStyle = { color: areaGradient(SOTA_COLORS[0]) };
  }
  return lineOpt;
}

function buildPieOption(data: any[], title: string, isDark: boolean) {
  const tc = getThemeColors(isDark);
  return {
    title: TITLE_STYLE(isDark, title),
    tooltip: { trigger: "item", ...TOOLTIP_STYLE(isDark) },
    toolbox: { feature: TOOLBOX_FEATURE, ...TOOLBOX_STYLE(isDark) },
    legend: { ...LEGEND_STYLE(isDark), orient: "horizontal", bottom: 10 },
    series: [
      {
        type: "pie",
        radius: ["35%", "70%"],
        center: ["50%", "52%"],
        roseType: "radius",
        itemStyle: {
          borderRadius: 6,
          borderColor: isDark ? DARK_BG_BORDER : LIGHT_BG_BORDER,
          borderWidth: 3,
          shadowBlur: 20,
          shadowColor: "rgba(99,102,241,0.25)",
        },
        label: {
          color: tc.textColor,
          fontFamily: FONT_FAMILY,
          fontSize: 12,
          formatter: "{b}: {c} ({d}%)",
        },
        labelLine: { lineStyle: { color: tc.axisLine } },
        emphasis: {
          itemStyle: { shadowBlur: 30, shadowColor: "rgba(99,102,241,0.5)" },
          label: { fontSize: 14, fontWeight: "bold" as const },
        },
        data: data.map((d, i) => ({
          name: d.name,
          value:
            d.value ?? Object.values(d).find((v: any) => typeof v === "number"),
          itemStyle: { color: SOTA_COLORS[i % SOTA_COLORS.length] },
        })),
        ...ANIMATION_ELASTIC,
      },
    ],
  };
}

function buildRadarOption(data: any[], title: string, isDark: boolean) {
  const tc = getThemeColors(isDark);
  const valueKey = data[0]
    ? Object.keys(data[0]).find((k) => k !== "name") || "value"
    : "value";
  return {
    title: TITLE_STYLE(isDark, title),
    tooltip: { ...TOOLTIP_STYLE(isDark) },
    toolbox: { feature: TOOLBOX_FEATURE, ...TOOLBOX_STYLE(isDark) },
    radar: {
      indicator: data.map((d) => ({
        name: d.name,
        max: Math.max(...data.map((x) => x[valueKey])) * 1.2,
      })),
      axisName: { color: tc.axisLabel, fontFamily: FONT_FAMILY, fontSize: 11 },
      splitLine: { lineStyle: { color: tc.splitLine } },
      splitArea: {
        areaStyle: { color: [isDark ? "transparent" : "transparent"] },
      },
      axisLine: { lineStyle: { color: tc.axisLine } },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: data.map((d) => d[valueKey]),
            name: title,
            areaStyle: { color: SOTA_COLORS[0] + "40" },
            lineStyle: { color: SOTA_COLORS[0], width: 2 },
            itemStyle: { color: SOTA_COLORS[0] },
          },
        ],
        ...ANIMATION_ELASTIC,
      },
    ],
  };
}

function buildScatterOption(data: any[], title: string, isDark: boolean) {
  const tc = getThemeColors(isDark);
  const valueKey = data[0]
    ? Object.keys(data[0]).find((k) => k !== "name") || "value"
    : "value";
  return {
    title: TITLE_STYLE(isDark, title),
    tooltip: { ...TOOLTIP_STYLE(isDark) },
    toolbox: { feature: TOOLBOX_FEATURE, ...TOOLBOX_STYLE(isDark) },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: 80,
      containLabel: true,
    },
    xAxis: {
      type: "value",
      axisLine: { lineStyle: { color: tc.axisLine } },
      axisLabel: { color: tc.axisLabel, fontFamily: FONT_FAMILY, fontSize: 11 },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: tc.axisLine } },
      axisLabel: { color: tc.axisLabel, fontFamily: FONT_FAMILY, fontSize: 11 },
      splitLine: {
        lineStyle: { color: tc.splitLine, type: "dashed" as const },
      },
    },
    series: [
      {
        type: "scatter",
        data: data.map((d) => [d.name, d[valueKey]]),
        symbolSize: 16,
        itemStyle: {
          color: SOTA_COLORS[0],
          shadowBlur: 15,
          shadowColor: SOTA_COLORS[0] + "50",
        },
        emphasis: { itemStyle: { shadowBlur: 25 } },
        ...ANIMATION_CUBIC,
      },
    ],
  };
}

function buildTreemapOption(data: any[], title: string, isDark: boolean) {
  const tc = getThemeColors(isDark);
  const valueKey = data[0]
    ? Object.keys(data[0]).find((k) => k !== "name") || "value"
    : "value";
  return {
    title: TITLE_STYLE(isDark, title),
    tooltip: { ...TOOLTIP_STYLE(isDark) },
    toolbox: { feature: TOOLBOX_FEATURE, ...TOOLBOX_STYLE(isDark) },
    series: [
      {
        type: "treemap",
        data: data.map((d, i) => ({
          name: d.name,
          value: d[valueKey],
          itemStyle: { color: SOTA_COLORS[i % SOTA_COLORS.length] },
        })),
        label: { color: "#fff", fontFamily: FONT_FAMILY, fontSize: 12 },
        upperLabel: { color: tc.textColor, fontFamily: FONT_FAMILY },
        ...ANIMATION_CUBIC,
      },
    ],
  };
}

function buildFunnelOption(data: any[], title: string, isDark: boolean) {
  const tc = getThemeColors(isDark);
  const valueKey = data[0]
    ? Object.keys(data[0]).find((k) => k !== "name") || "value"
    : "value";
  return {
    title: TITLE_STYLE(isDark, title),
    tooltip: { ...TOOLTIP_STYLE(isDark) },
    toolbox: { feature: TOOLBOX_FEATURE, ...TOOLBOX_STYLE(isDark) },
    legend: { ...LEGEND_STYLE(isDark), bottom: 10 },
    series: [
      {
        type: "funnel",
        left: "10%",
        right: "10%",
        top: 80,
        bottom: 60,
        label: {
          color: tc.textColor,
          fontFamily: FONT_FAMILY,
          fontSize: 12,
          formatter: "{b}: {c}",
        },
        labelLine: { lineStyle: { color: tc.axisLine } },
        data: data.map((d, i) => ({
          name: d.name,
          value: d[valueKey],
          itemStyle: { color: SOTA_COLORS[i % SOTA_COLORS.length] },
        })),
        ...ANIMATION_CUBIC,
      },
    ],
  };
}

function buildRadialBarOption(data: any[], title: string, isDark: boolean) {
  const tc = getThemeColors(isDark);
  const valueKey = data[0]
    ? Object.keys(data[0]).find((k) => k !== "name") || "value"
    : "value";
  return {
    title: TITLE_STYLE(isDark, title),
    tooltip: { ...TOOLTIP_STYLE(isDark) },
    toolbox: { feature: TOOLBOX_FEATURE, ...TOOLBOX_STYLE(isDark) },
    legend: { ...LEGEND_STYLE(isDark), bottom: 10 },
    series: [
      {
        type: "bar",
        coordinateSystem: "polar",
        data: data.map((d, i) => ({
          name: d.name,
          value: d[valueKey],
          itemStyle: { color: SOTA_COLORS[i % SOTA_COLORS.length] },
        })),
        ...ANIMATION_ELASTIC,
      },
    ],
    polar: {},
    angleAxis: { axisLine: { lineStyle: { color: tc.axisLine } } },
    radiusAxis: {
      type: "category",
      data: data.map((d) => d.name),
      axisLabel: { color: tc.axisLabel, fontFamily: FONT_FAMILY, fontSize: 11 },
    },
  };
}

const DARK_BG_BORDER = "#0B1120";
const LIGHT_BG_BORDER = "#ffffff";

function buildOption(
  chart: ChartData,
  isDark: boolean,
): Record<string, any> | null {
  const { type, dataset, title, echartsOptions } = chart;
  if (!dataset || dataset.length === 0) return null;

  const lowerType = type.toLowerCase();
  let option: Record<string, any> | null = null;

  const seriesKeys = dataset[0]
    ? Object.keys(dataset[0]).filter((k) => k !== "name")
    : [];

  switch (lowerType) {
    case "bar":
      option = buildBarOption(
        dataset,
        title,
        isDark,
        seriesKeys.length > 1 ? seriesKeys : undefined,
      );
      break;
    case "line":
      option = buildLineOption(
        dataset,
        title,
        isDark,
        seriesKeys.length > 1 ? seriesKeys : undefined,
      );
      break;
    case "area":
      option = buildAreaOption(
        dataset,
        title,
        isDark,
        seriesKeys.length > 1 ? seriesKeys : undefined,
      );
      break;
    case "pie":
    case "donut":
      option = buildPieOption(dataset, title, isDark);
      break;
    case "radar":
      option = buildRadarOption(dataset, title, isDark);
      break;
    case "scatter":
      option = buildScatterOption(dataset, title, isDark);
      break;
    case "treemap":
      option = buildTreemapOption(dataset, title, isDark);
      break;
    case "funnel":
      option = buildFunnelOption(dataset, title, isDark);
      break;
    case "radialbar":
    case "radialbar":
      option = buildRadialBarOption(dataset, title, isDark);
      break;
    case "composed":
      option = buildBarOption(
        dataset,
        title,
        isDark,
        seriesKeys.length > 1 ? seriesKeys : undefined,
      );
      break;
    default:
      return null;
  }

  if (echartsOptions && typeof echartsOptions === "object") {
    option = { ...option, ...echartsOptions };
  }

  return option;
}

export function EChartRenderer({ chart }: { chart: ChartData }) {
  const { t } = useTranslation();
  const chartRef = useRef<any>(null);
  const [downloading, setDownloading] = useState(false);
  const isDark = resolveDarkMode();

  const option = useMemo(() => buildOption(chart, isDark), [chart, isDark]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const instance = chartRef.current?.getEchartsInstance();
      if (instance) {
        const url = instance.getDataURL({
          type: "png",
          pixelRatio: 2,
          backgroundColor: isDark ? "#0B1120" : "#ffffff",
        });
        const blob = await (await fetch(url)).blob();
        saveAs(blob, `chart-${v4().split("-")[0]}.png`);
      }
    } finally {
      setDownloading(false);
    }
  }, [isDark]);

  if (!option) return null;

  return (
    <div className="relative w-full">
      <div className="absolute top-3 right-3 z-50">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          aria-label={
            downloading
              ? t("chartable.downloading")
              : t("chartable.downloadGraph")
          }
          className="p-1.5 rounded-lg border border-white/10 bg-zinc-800/80 hover:bg-zinc-700/80 transition-all cursor-pointer disabled:cursor-default"
        >
          {downloading ? (
            <CircleNotch className="text-theme-text-primary w-5 h-5 animate-spin" />
          ) : (
            <DownloadSimple
              weight="bold"
              className="text-theme-text-primary w-5 h-5 pointer-events-none"
            />
          )}
        </button>
      </div>
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: 400, width: "100%" }}
        opts={{ renderer: "canvas" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
}

export default memo(EChartRenderer);
