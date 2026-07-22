// SPDX-License-Identifier: MIT

import { Fragment } from "react";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const normalized = query.trim();

  if (!normalized || !text) return <>{text}</>;

  const pattern = new RegExp(`(${escapeRegExp(normalized)})`, "ig");

  return (
    <>
      {text
        .split(pattern)
        .map((part, index) =>
          part.toLocaleLowerCase() === normalized.toLocaleLowerCase() ? (
            <mark
              key={index}
              className="rounded bg-theme-bg-tertiary px-0.5 text-inherit"
            >
              {part}
            </mark>
          ) : (
            <Fragment key={index}>{part}</Fragment>
          ),
        )}
    </>
  );
}
