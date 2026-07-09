// SPDX-License-Identifier: MIT
// Purpose: Chat chart renderer — ECharts SOTA rendering with backward-compatible
// rechart.js {type, dataset, title} format. Lazy-loaded to avoid ESM TDP races.
// Docs: Replaces recharts/@tremor with Apache ECharts for gradient/glow/animation.

import DOMPurify from "@/utils/chat/purify";
import { safeJsonParse } from "@/utils/request";
import renderMarkdown from "@/utils/chat/markdown";
import { memo } from "react";
import EChartRenderer from "./EChartRenderer";

const CHART_SANITIZE_OPTS: any = {
  ALLOWED_TAGS: [
    "svg",
    "path",
    "rect",
    "g",
    "text",
    "line",
    "circle",
    "div",
    "span",
    "p",
    "pre",
    "code",
    "h3",
    "strong",
    "em",
    "br",
  ],
  ALLOWED_ATTR: [
    "d",
    "fill",
    "stroke",
    "width",
    "height",
    "viewBox",
    "x",
    "y",
    "class",
    "id",
    "style",
  ],
};
const safeChart = (html: string) =>
  DOMPurify.sanitize(html, CHART_SANITIZE_OPTS);

export function Chartable({ props }: any) {
  const content =
    typeof props.content === "string"
      ? safeJsonParse(props.content, null)
      : props.content;
  if (content === null) return null;

  let data: any[];
  try {
    data =
      typeof content.dataset === "string"
        ? JSON.parse(content.dataset)
        : (content.dataset as any[]);
  } catch {
    data = [];
  }
  if (!data || data.length === 0) return null;

  const chart = {
    type: content.type,
    dataset: data,
    title: content.title || "",
    caption: content.caption || "",
    echartsOptions: content.echartsOptions || undefined,
  };

  return (
    <div className="flex justify-start w-full">
      <div className="py-2 px-4 w-full flex flex-col md:max-w-[80%]">
        <div className="bg-theme-bg-primary rounded-2xl border border-white/5 light:border-theme-border-primary overflow-hidden shadow-xl">
          <EChartRenderer chart={chart} />
        </div>
        {content.caption && (
          <span
            className="flex flex-col gap-y-1 mt-2 text-sm text-theme-text-secondary"
            dangerouslySetInnerHTML={{
              __html: safeChart(renderMarkdown(content.caption)),
            }}
          />
        )}
      </div>
    </div>
  );
}

export default memo(Chartable);
