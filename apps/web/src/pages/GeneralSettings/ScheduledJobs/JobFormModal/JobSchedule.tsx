// SPDX-License-Identifier: MIT
// Purpose: Job schedule configuration component
// Docs: JobSchedule.doc.md
import { useTranslation } from "react-i18next";
import CronBuilder from "./CronBuilder";
import { humanizeCron } from "../utils/cron";

interface JobScheduleMode {
  value: string;
  labelKey: string;
}

const JOB_SCHEDULE_MODES: JobScheduleMode[] = [
  { value: "builder", labelKey: "scheduledJobs.modal.modeBuilder" },
  { value: "custom", labelKey: "scheduledJobs.modal.modeCustom" },
];

interface JobScheduleProps {
  schedule: string;
  scheduleMode: string;
  error: boolean;
  onScheduleChange: (schedule: string) => void;
  onModeChange: (mode: string) => void;
}

export default function JobSchedule({
  schedule,
  scheduleMode,
  error,
  onScheduleChange,
  onModeChange,
}: JobScheduleProps): React.ReactElement {
  const { t, i18n } = useTranslation();
  const modeTabs = JOB_SCHEDULE_MODES.map((mode) => ({
    value: mode.value,
    label: t(mode.labelKey),
  }));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onScheduleChange(e.target.value);
  };

  return (
    <div>
      <label className="flex items-baseline gap-1.5 mb-2 text-sm font-medium text-theme-text-primary">
        <span>
          {t("scheduledJobs.modal.scheduleLabel")}{" "}
          <span className="text-red-400">*</span>
        </span>
        {error && (
          <span className="text-red-400 italic font-normal">
            {t("scheduledJobs.modal.required", "Required")}
          </span>
        )}
      </label>

      <div className="flex gap-1 mb-2 p-1 bg-theme-settings-input-bg rounded-lg w-fit">
        {modeTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onModeChange(tab.value)}
            className={`border-none px-3 py-1 text-xs rounded-md transition-colors ${
              scheduleMode === tab.value
                ? "bg-zinc-50 text-zinc-950 light:bg-zinc-950 light:text-white"
                : "text-theme-text-secondary hover:text-theme-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {scheduleMode === "builder" && (
        <div
          className={`rounded-lg border ${
            error ? "border-red-300" : "border-transparent"
          }`}
        >
          <CronBuilder value={schedule} onChange={onScheduleChange} />
        </div>
      )}

      {scheduleMode === "custom" && (
        <input
          type="text"
          name="schedule"
          value={schedule}
          onChange={handleInputChange}
          placeholder={t("scheduledJobs.modal.cronPlaceholder")}
          className={`bg-theme-settings-input-bg text-theme-text-primary placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button outline-none block w-full p-2.5 border ${
            error ? "border-red-300" : "border-transparent"
          }`}
        />
      )}

      <p className="text-xs text-theme-text-secondary mt-2">
        {t("scheduledJobs.modal.currentSchedule")}{" "}
        <code className="text-theme-text-primary">{schedule}</code>
        {schedule && (
          <span className="ml-2">
            {`— ${humanizeCron(schedule, i18n.language)}`}
          </span>
        )}
      </p>
    </div>
  );
}
