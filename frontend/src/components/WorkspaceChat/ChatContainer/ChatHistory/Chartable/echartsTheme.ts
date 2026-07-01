// SPDX-License-Identifier: MIT
// Purpose: SOTA ECharts theme constants — gradients, glow, animations.
// Docs: Mirrors sin-code image-graph visual quality (Apache ECharts 5.5+).

export const SOTA_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ef4444", // red
  "#a855f7", // purple
  "#06b6d4", // cyan
];

export const DARK_BG = "#0B1120";
export const LIGHT_BG = "#ffffff";

export const FONT_FAMILY =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const AXIS_LABEL_COLOR_DARK = "#94a3b8";
export const AXIS_LABEL_COLOR_LIGHT = "#64748b";
export const AXIS_LINE_COLOR_DARK = "#1e293b";
export const AXIS_LINE_COLOR_LIGHT = "#e2e8f0";
export const SPLIT_LINE_COLOR_DARK = "#1e293b";
export const SPLIT_LINE_COLOR_LIGHT = "#f1f5f9";

export function getThemeColors(isDark: boolean) {
  return {
    bg: isDark ? DARK_BG : LIGHT_BG,
    textColor: isDark ? "#e2e8f0" : "#1e293b",
    axisLabel: isDark ? AXIS_LABEL_COLOR_DARK : AXIS_LABEL_COLOR_LIGHT,
    axisLine: isDark ? AXIS_LINE_COLOR_DARK : AXIS_LINE_COLOR_LIGHT,
    splitLine: isDark ? SPLIT_LINE_COLOR_DARK : SPLIT_LINE_COLOR_LIGHT,
    tooltipBg: isDark ? "rgba(11,17,32,0.95)" : "rgba(255,255,255,0.98)",
    tooltipBorder: isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)",
    tooltipText: isDark ? "#e2e8f0" : "#1e293b",
  };
}

export function barGradient(color: string, isDark: boolean) {
  return {
    type: "linear" as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color },
      { offset: 1, color: isDark ? color + "20" : color + "30" },
    ],
  };
}

export function lineGradient(color: string) {
  return {
    type: "linear" as const,
    x: 0,
    y: 0,
    x2: 1,
    y2: 0,
    colorStops: [
      { offset: 0, color: color + "50" },
      { offset: 1, color },
    ],
  };
}

export function areaGradient(color: string) {
  return {
    type: "linear" as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: color + "60" },
      { offset: 1, color: color + "05" },
    ],
  };
}

export const GLOW_SHADOW = {
  shadowBlur: 15,
  shadowColor: "rgba(99,102,241,0.25)",
};

export const BAR_BORDER_RADIUS = [8, 8, 0, 0] as [
  number,
  number,
  number,
  number,
];

export const ANIMATION_ELASTIC = {
  animationDuration: 1200,
  animationEasing: "elasticOut" as const,
  animationDelay: (idx: number) => idx * 80,
};

export const ANIMATION_CUBIC = {
  animationDuration: 1000,
  animationEasing: "cubicOut" as const,
  animationDelay: (idx: number) => idx * 80,
};

export const TOOLTIP_STYLE = (isDark: boolean) => ({
  backgroundColor: isDark ? "rgba(11,17,32,0.95)" : "rgba(255,255,255,0.98)",
  borderColor: isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)",
  borderWidth: 1,
  textStyle: {
    color: isDark ? "#e2e8f0" : "#1e293b",
    fontFamily: FONT_FAMILY,
    fontSize: 13,
  },
  padding: [10, 14],
  borderRadius: 10,
  extraCssText:
    "backdrop-filter: blur(8px); box-shadow: 0 8px 32px rgba(0,0,0,0.3);",
});

export const TOOLBOX_FEATURE = {
  saveAsImage: {
    pixelRatio: 2,
    name: "opensin-chart",
    backgroundColor: DARK_BG,
  },
  dataView: {
    readOnly: true,
    title: "Daten",
    lang: ["Datenansicht", "Schließen", "Aktualisieren"],
  },
  restore: { title: "Zurücksetzen" },
};

export const TOOLBOX_STYLE = (isDark: boolean) => ({
  right: 15,
  top: 10,
  iconStyle: {
    borderColor: isDark ? "#64748b" : "#94a3b8",
  },
  emphasis: {
    iconStyle: {
      borderColor: isDark ? "#818cf8" : "#6366f1",
    },
  },
});

export const LEGEND_STYLE = (isDark: boolean) => ({
  textStyle: {
    color: isDark ? "#94a3b8" : "#64748b",
    fontFamily: FONT_FAMILY,
    fontSize: 12,
  },
  itemGap: 20,
  itemWidth: 14,
  itemHeight: 14,
  icon: "roundRect",
  top: 8,
});

export const TITLE_STYLE = (
  isDark: boolean,
  title: string,
  subtitle?: string,
) => ({
  text: title,
  subtext: subtitle || "",
  left: "center",
  textStyle: {
    color: isDark ? "#f1f5f9" : "#0f172a",
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    fontWeight: 600 as const,
  },
  subtextStyle: {
    color: isDark ? "#64748b" : "#94a3b8",
    fontFamily: FONT_FAMILY,
    fontSize: 13,
  },
  top: 10,
});
