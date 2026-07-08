// SPDX-License-Identifier: MIT
// Politician profile card with details, stats, and add-to-workspace button
import { Users } from "@phosphor-icons/react/dist/csr/Users";
import { Briefcase } from "@phosphor-icons/react/dist/csr/Briefcase";
import { MapPin } from "@phosphor-icons/react/dist/csr/MapPin";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/csr/EnvelopeSimple";
import { Calendar } from "@phosphor-icons/react/dist/csr/Calendar";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { useTranslation } from "react-i18next";

interface ProfileCardProps {
  profileData: any;
  adding: Set<string>;
  workspaceSlug: string | undefined;
  onBack: () => void;
  onAddToWorkspace: (id: string) => void;
}

export function ProfileCard({ profileData, adding, workspaceSlug, onBack, onAddToWorkspace }: ProfileCardProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label={t("common.close")}
        className="flex items-center gap-1.5 text-xs text-zinc-400 light:text-slate-500 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer self-start"
      >
        <ArrowLeft size={12} weight="bold" />
        {t("common.back", "Zurück")}
      </button>
      <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200">
        <div className="w-12 h-12 rounded-full bg-zinc-700 light:bg-slate-200 flex items-center justify-center flex-shrink-0">
          <Users size={20} className="text-zinc-400 light:text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-theme-text-primary light:text-theme-text-primary truncate">
            {profileData.fullName ||
              `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() ||
              profileData.id}
          </p>
          <p className="text-xs text-zinc-500 light:text-slate-400 truncate">
            {profileData.party || "—"}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-xs text-zinc-300 light:text-slate-600">
        {profileData.party && (
          <div className="flex items-center gap-2">
            <Briefcase size={12} className="text-zinc-500 flex-shrink-0" /> {profileData.party}
          </div>
        )}
        {profileData.state && (
          <div className="flex items-center gap-2">
            <MapPin size={12} className="text-zinc-500 flex-shrink-0" /> {profileData.state}
          </div>
        )}
        {profileData.electoralDistrict && (
          <div className="flex items-center gap-2">
            <MapPin size={12} className="text-zinc-500 flex-shrink-0" /> {profileData.electoralDistrict}
          </div>
        )}
        {profileData.email && (
          <div className="flex items-center gap-2">
            <EnvelopeSimple size={12} className="text-zinc-500 flex-shrink-0" /> {profileData.email}
          </div>
        )}
        {profileData.birthDate && (
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-zinc-500 flex-shrink-0" />{" "}
            {new Date(profileData.birthDate).toISOString().split("T")[0]}
          </div>
        )}
        {profileData.profession && (
          <div className="flex items-center gap-2">
            <Briefcase size={12} className="text-zinc-500 flex-shrink-0" /> {profileData.profession}
          </div>
        )}
      </div>
      {profileData.bio && (
        <div className="p-3 rounded-xl bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 light:text-slate-400 mb-1">
            {t("sidebar.database.biography", "Biografie")}
          </p>
          <p className="text-xs text-zinc-300 light:text-slate-600 leading-relaxed">
            {profileData.bio}
          </p>
        </div>
      )}
      {profileData.stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200 text-center">
            <p className="text-lg font-bold text-theme-text-primary light:text-theme-text-primary">
              {profileData.stats.speeches ?? 0}
            </p>
            <p className="text-[10px] text-zinc-500 light:text-slate-400">
              {t("sidebar.database.statSpeeches", "Reden")}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200 text-center">
            <p className="text-lg font-bold text-theme-text-primary light:text-theme-text-primary">
              {profileData.stats.votes ?? 0}
            </p>
            <p className="text-[10px] text-zinc-500 light:text-slate-400">
              {t("sidebar.database.statVotes", "Abstimmungen")}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-zinc-800 light:bg-slate-50 border border-zinc-700 light:border-slate-200 text-center">
            <p className="text-lg font-bold text-theme-text-primary light:text-theme-text-primary">
              {profileData.stats.mandates ?? 0}
            </p>
            <p className="text-[10px] text-zinc-500 light:text-slate-400">
              {t("sidebar.database.statMandates", "Mandate")}
            </p>
          </div>
        </div>
      )}
      {profileData.profileUrl && (
        <a
          href={profileData.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ArrowSquareOut size={12} />
          {t("sidebar.database.openProfile", "Profil öffnen")}
        </a>
      )}
      <button
        type="button"
        onClick={() => onAddToWorkspace(profileData.id)}
        aria-label={t("common.addToWorkspace", "Add to workspace")}
        disabled={adding.has(profileData.id) || !workspaceSlug}
        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium transition-colors"
      >
        <Plus size={14} weight="bold" />
        {t("sidebar.database.addToWorkspace", "Zum Workspace hinzufügen")}
      </button>
    </div>
  );
}
