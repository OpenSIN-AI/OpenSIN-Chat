// SPDX-License-Identifier: MIT
export default function useQuery() {
  return new URLSearchParams(window.location.search);
}
