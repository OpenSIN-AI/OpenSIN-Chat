// SPDX-License-Identifier: MIT

export interface CodeTaskOutput {
  type: "task" | "file-change" | "diff" | "terminal" | "test-result" | "summary";
  title?: string;
  path?: string;
  status?: "running" | "done" | "error";
  additions?: number;
  deletions?: number;
  command?: string;
  content?: string;
}
