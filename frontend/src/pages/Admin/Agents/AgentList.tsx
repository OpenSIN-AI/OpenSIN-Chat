// SPDX-License-Identifier: MIT
import { isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { DefaultBadge } from "./Badges/default";
import { Tooltip } from "react-tooltip";

export default function AgentList({
  isDefault = false,
  skills = {},
  selectedSkill = null,
  handleClick = null,
  activeSkills = [],
  Icon = null,
}: {
  isDefault?: boolean;
  skills: Record<
    string,
    { title: string; Icon?: React.ComponentType<{ size: number }> }
  >;
  selectedSkill?: string | null;
  handleClick?: ((skill: string) => void) | null;
  activeSkills?: string[];
  Icon?: React.ComponentType<{ size: number }> | null;
}) {
  const { t } = useTranslation();
  if (Object.keys(skills).length === 0) return null;

  return (
    <>
      <div
        className={`bg-theme-bg-secondary text-theme-text-primary rounded-xl ${
          isMobile ? "w-full" : "min-w-[360px] w-fit"
        }`}
      >
        {Object.entries(skills).map(([skill, settings], index) => (
          <div
            key={skill}
            className={`py-3 px-4 flex items-center justify-between ${
              index === 0 ? "rounded-t-xl" : ""
            } ${
              index === Object.keys(skills).length - 1
                ? "rounded-b-xl"
                : "border-b border-white/10"
            } cursor-pointer transition-all duration-300 hover:bg-theme-bg-primary ${
              selectedSkill === skill
                ? "bg-white/10 light:bg-theme-bg-sidebar"
                : ""
            }`}
            onClick={() => handleClick?.(skill)}
          >
            <div className="flex items-center gap-x-2">
              {settings.Icon ? (
                <settings.Icon size={16} />
              ) : (
                Icon && <Icon size={16} />
              )}
              <div className="text-sm font-light">{settings.title}</div>
            </div>
            <div className="flex items-center gap-x-2">
              {isDefault ? (
                <DefaultBadge title={skill} />
              ) : (
                <div className="text-sm text-theme-text-secondary font-medium">
                  {activeSkills.includes(skill)
                    ? t("common.on")
                    : t("common.off")}
                </div>
              )}
              <CaretRight
                size={14}
                weight="bold"
                className="text-theme-text-secondary"
              />
            </div>
          </div>
        ))}
      </div>
      {isDefault && (
        <Tooltip
          id="default-skill"
          place="bottom"
          delayShow={300}
          className="tooltip light:invert-0 !text-xs"
        />
      )}
    </>
  );
}
