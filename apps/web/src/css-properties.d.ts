// SPDX-License-Identifier: MIT
// Purpose: Augment React.CSSProperties to allow CSS custom properties
// (variables) like --content-height, --sidebar-width, etc.
// This is the standard approach for typed CSS variables in React.
import "react";

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
