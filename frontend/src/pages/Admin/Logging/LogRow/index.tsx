// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretUp } from "@phosphor-icons/react/dist/csr/CaretUp";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { safeJsonParse } from "@/utils/request";

type Log = {
  event: string;
  user: { username: string };
  occurredAt: string;
  metadata: string;
};

type LogRowProps = {
  log: Log;
};

export default function LogRow({ log }: LogRowProps): JSX.Element {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [hasMetadata, setHasMetadata] = useState(false);

  useEffect(() => {
    function parseAndSetMetadata() {
      const data = safeJsonParse(log.metadata, {});
      setHasMetadata(Object.keys(data)?.length > 0);
      setMetadata(data);
    }
    parseAndSetMetadata();
  }, [log.metadata]);

  const handleRowClick = () => {
    if (log.metadata !== "{}") {
      setExpanded(!expanded);
    }
  };

  return (
    <>
      <tr
        onClick={handleRowClick}
        className={`bg-transparent text-white text-opacity-80 text-xs font-medium border-b border-white/10 h-10 ${
          hasMetadata ? "cursor-pointer hover:bg-white/5" : ""
        }`}
      >
        <EventBadge event={log.event} />
        <td className="px-6 border-transparent transform transition-transform duration-200">
          {log.user?.username ?? "—"}
        </td>
        <td className="px-6 border-transparent transform transition-transform duration-200">
          {log.occurredAt}
        </td>
        <td
          className={`px-2 gap-x-1 flex items-center justify-center transform transition-transform duration-200`}
        >
          {hasMetadata &&
            (expanded ? (
              <>
                <CaretUp weight="bold" size={20} />
                <p className="text-xs text-theme-text-secondary w-[20px]">
                  {t("logging.logRow.hide")}
                </p>
              </>
            ) : (
              <>
                <CaretDown weight="bold" size={20} />
                <p className="text-xs text-theme-text-secondary w-[20px]">
                  {t("logging.logRow.show")}
                </p>
              </>
            ))}
        </td>
      </tr>
      <EventMetadata metadata={metadata} expanded={expanded} />
    </>
  );
}

type EventMetadataProps = {
  metadata: any;
  expanded?: boolean;
};

const EventMetadata = ({
  metadata,
  expanded = false,
}: EventMetadataProps): JSX.Element | null => {
  const { t } = useTranslation();
  if (!metadata || !expanded) return null;
  return (
    <tr className="bg-theme-bg-primary">
      <td
        colSpan={1}
        className="px-6 py-4 font-medium text-theme-text-primary rounded-l-2xl"
      >
        {t("logging.logRow.eventMetadata")}
      </td>
      <td colSpan={3} className="px-6 py-4 rounded-r-2xl">
        <div className="w-full rounded-lg bg-theme-bg-secondary p-2 text-white shadow-sm border-white/10 border bg-opacity-10">
          <pre className="overflow-scroll">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      </td>
    </tr>
  );
};

type EventBadgeProps = {
  event: string;
};

const EventBadge = ({ event }: EventBadgeProps): JSX.Element => {
  let colorTheme = {
    bg: "bg-sky-600/20",
    text: "text-sky-400 light:text-sky-800",
  };
  if (event.includes("update"))
    colorTheme = {
      bg: "bg-yellow-600/20",
      text: "text-yellow-400 light:text-yellow-800",
    };
  if (event.includes("failed_") || event.includes("deleted"))
    colorTheme = {
      bg: "bg-red-600/20",
      text: "text-red-400 light:text-red-800",
    };
  if (event === "login_event")
    colorTheme = {
      bg: "bg-green-600/20",
      text: "text-green-400 light:text-green-800",
    };

  return (
    <td className="px-6 py-2 font-medium whitespace-nowrap text-white flex items-center">
      <span
        className={`rounded-full ${colorTheme.bg} px-2 py-0.5 text-xs font-medium ${colorTheme.text} shadow-sm`}
      >
        {event}
      </span>
    </td>
  );
};
