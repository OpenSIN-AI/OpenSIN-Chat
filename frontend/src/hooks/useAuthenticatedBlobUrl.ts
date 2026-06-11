// SPDX-License-Identifier: MIT
import { useEffect, useState } from "react";
import { baseHeaders } from "@/utils/request";

/**
 * Fetches an auth-protected file (e.g. /agent-skills/generated-files/*) with
 * the Bearer header and exposes it as a blob: URL for use in <img>/<iframe>.
 * A plain src attribute would receive a 401 from the protected endpoint.
 *
 * Ownership: the object URL is created and revoked exclusively inside the
 * effect (revoked on unmount and whenever `url` changes). Consumers must not
 * revoke it themselves.
 */
export default function useAuthenticatedBlobUrl(url?: string | null) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      setError(false);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;
    setBlobUrl(null);
    setError(false);

    fetch(url, { headers: baseHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return { blobUrl, error, loading: !blobUrl && !error };
}
