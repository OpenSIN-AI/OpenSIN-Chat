// SPDX-License-Identifier: MIT
// Docs: utils.doc.md
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { PaperPlaneTilt } from "@phosphor-icons/react/dist/csr/PaperPlaneTilt";
import { ChartBar } from "@phosphor-icons/react/dist/csr/ChartBar";
import { PencilSimple } from "@phosphor-icons/react/dist/csr/PencilSimple";
export { filterSkillCategories } from "../utils";

type TFunction = (key: string) => string;

type Skill = {
  name: string;
  title: string;
  description: string;
};

type SkillCategory = {
  title: string;
  description: string;
  icon: any;
  skills: Skill[];
};

type OutlookSkills = Record<string, SkillCategory>;

export const getOutlookSkills = (t: TFunction): OutlookSkills => ({
  search: {
    title: t("agent.skill.outlook.categories.search.title"),
    description: t("agent.skill.outlook.categories.search.description"),
    icon: MagnifyingGlass,
    skills: [
      {
        name: "outlook-get-inbox",
        title: t("agent.skill.outlook.skills.getInbox.title"),
        description: t("agent.skill.outlook.skills.getInbox.description"),
      },
      {
        name: "outlook-search",
        title: t("agent.skill.outlook.skills.search.title"),
        description: t("agent.skill.outlook.skills.search.description"),
      },
      {
        name: "outlook-read-thread",
        title: t("agent.skill.outlook.skills.readThread.title"),
        description: t("agent.skill.outlook.skills.readThread.description"),
      },
    ],
  },
  drafts: {
    title: t("agent.skill.outlook.categories.drafts.title"),
    description: t("agent.skill.outlook.categories.drafts.description"),
    icon: PencilSimple,
    skills: [
      {
        name: "outlook-create-draft",
        title: t("agent.skill.outlook.skills.createDraft.title"),
        description: t("agent.skill.outlook.skills.createDraft.description"),
      },
      {
        name: "outlook-update-draft",
        title: t("agent.skill.outlook.skills.updateDraft.title"),
        description: t("agent.skill.outlook.skills.updateDraft.description"),
      },
      {
        name: "outlook-list-drafts",
        title: t("agent.skill.outlook.skills.listDrafts.title"),
        description: t("agent.skill.outlook.skills.listDrafts.description"),
      },
      {
        name: "outlook-delete-draft",
        title: t("agent.skill.outlook.skills.deleteDraft.title"),
        description: t("agent.skill.outlook.skills.deleteDraft.description"),
      },
      {
        name: "outlook-send-draft",
        title: t("agent.skill.outlook.skills.sendDraft.title"),
        description: t("agent.skill.outlook.skills.sendDraft.description"),
      },
    ],
  },
  send: {
    title: t("agent.skill.outlook.categories.send.title"),
    description: t("agent.skill.outlook.categories.send.description"),
    icon: PaperPlaneTilt,
    skills: [
      {
        name: "outlook-send-email",
        title: t("agent.skill.outlook.skills.sendEmail.title"),
        description: t("agent.skill.outlook.skills.sendEmail.description"),
      },
    ],
  },
  account: {
    title: t("agent.skill.outlook.categories.account.title"),
    description: t("agent.skill.outlook.categories.account.description"),
    icon: ChartBar,
    skills: [
      {
        name: "outlook-get-mailbox-stats",
        title: t("agent.skill.outlook.skills.getMailboxStats.title"),
        description: t(
          "agent.skill.outlook.skills.getMailboxStats.description",
        ),
      },
    ],
  },
});
