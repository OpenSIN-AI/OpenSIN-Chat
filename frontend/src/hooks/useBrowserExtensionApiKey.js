// SPDX-License-Identifier: MIT
import useSWR from "swr";
import BrowserExtensionApiKey from "@/models/browserExtensionApiKey";

export const BROWSER_EXTENSION_API_KEY_KEY = "browser-extension/api-keys";

export default function useBrowserExtensionApiKey() {
  const { data, error, isLoading, mutate } = useSWR(
    BROWSER_EXTENSION_API_KEY_KEY,
    () => BrowserExtensionApiKey.getAll(),
  );

  return {
    apiKeys: data?.apiKeys ?? [],
    isMultiUser: data?.apiKeys?.some((key) => key.user !== null) ?? false,
    error: data?.success === false ? data?.error : error?.message || null,
    isLoading,
    refresh: mutate,
    mutate,
  };
}
