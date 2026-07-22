// SPDX-License-Identifier: MIT

export function activityDuration(startedAt?: number, endedAt?: number): string | null {
  if (!startedAt) return null;

  const end = endedAt || Date.now();
  const seconds = Math.max(0, Math.round((end - startedAt) / 1000));

  if (seconds < 1) return "<1 Sek.";
  if (seconds < 60) return `${seconds} Sek.`;

  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  if (!remaining) return `${minutes} Min.`;
  return `${minutes} Min. ${remaining} Sek.`;
}
