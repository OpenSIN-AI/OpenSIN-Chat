// SPDX-License-Identifier: MIT
// Docs: features.doc.md
import type { ComponentType } from "react";
import LiveSyncToggle from "./Features/LiveSync/toggle";

type ConfigurableFeature = {
  title: string;
  component: ComponentType;
  key: string;
};

export const configurableFeatures: Record<string, ConfigurableFeature> = {
  experimental_live_file_sync: {
    title: "Live Document Sync",
    component: LiveSyncToggle,
    key: "experimental_live_file_sync",
  },
};