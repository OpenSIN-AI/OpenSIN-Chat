// SPDX-License-Identifier: MIT
import { Link } from "react-router-dom";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import useSystemSettings from "@/hooks/useSystemSettings";
import { PROVIDER_PRIVACY_MAP } from "./constants";

/**
 * Resolves a provider key to its entry in the map.
 * Returns null for null/undefined keys, and a synthetic entry with the raw
 * key as the name for unknown providers.
 */
function resolveProvider(map, key) {
  if (key == null) return null;
  return (
    map[key] ?? {
      name: key.charAt(0).toUpperCase() + key.slice(1),
    }
  );
}

/**
 * Renders one provider row: logo (if known), name, and either a privacy-policy
 * link or a bullet-list of privacy descriptions.
 */
function ProviderRow({ label, providerKey, map }) {
  const entry = resolveProvider(map, providerKey);
  const name = entry?.name ?? "Unknown";

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <div className="flex items-center gap-2">
        {entry?.logo && (
          <img
            src={entry.logo}
            alt={name}
            className="h-6 w-6 rounded object-contain"
          />
        )}
        <span className="font-medium text-white">{name}</span>
      </div>
      {entry?.policyUrl && (
        <Link
          to={entry.policyUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
        >
          <ArrowSquareOut size={14} />
          <span>privacy policy</span>
        </Link>
      )}
      {!entry?.policyUrl && entry?.description && (
        <ul className="list-disc pl-4 text-sm text-gray-400">
          {entry.description.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Displays the privacy posture of the three currently configured providers
 * (LLM, embedding engine, vector database).  Reads settings via the shared
 * useSystemSettings hook and renders nothing while they are loading.
 */
export default function ProviderPrivacy() {
  const { settings, loading } = useSystemSettings();
  if (loading || !settings) return null;

  return (
    <div className="flex flex-col gap-6">
      <ProviderRow
        label="LLM Provider"
        providerKey={settings.LLMProvider}
        map={PROVIDER_PRIVACY_MAP.llm}
      />
      <ProviderRow
        label="Embedding Preference"
        providerKey={settings.EmbeddingEngine}
        map={PROVIDER_PRIVACY_MAP.embeddingEngine}
      />
      <ProviderRow
        label="Vector Database"
        providerKey={settings.VectorDB}
        map={PROVIDER_PRIVACY_MAP.vectorDb}
      />
    </div>
  );
}
