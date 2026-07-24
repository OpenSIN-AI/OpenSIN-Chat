// SPDX-License-Identifier: MIT

import { Cloud } from "@phosphor-icons/react/dist/csr/Cloud";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/csr/EnvelopeSimple";
import { File } from "@phosphor-icons/react/dist/csr/File";
import { FolderSimple } from "@phosphor-icons/react/dist/csr/FolderSimple";
import { GithubLogo } from "@phosphor-icons/react/dist/csr/GithubLogo";
import { Globe } from "@phosphor-icons/react/dist/csr/Globe";
import { HardDrives } from "@phosphor-icons/react/dist/csr/HardDrives";
import { Note } from "@phosphor-icons/react/dist/csr/Note";
import { ShareNetwork } from "@phosphor-icons/react/dist/csr/ShareNetwork";
import { YoutubeLogo } from "@phosphor-icons/react/dist/csr/YoutubeLogo";
import type { NotebookSourceKind } from "./sources";

interface SourceIconProps {
  kind: NotebookSourceKind;
  size?: number;
}

const ICONS: Record<NotebookSourceKind, typeof File> = {
  file: File,
  web: Globe,
  youtube: YoutubeLogo,
  social: ShareNetwork,
  repository: GithubLogo,
  notes: Note,
  cloud: Cloud,
  email: EnvelopeSimple,
  machine: HardDrives,
};

export default function SourceIcon({ kind, size = 17 }: SourceIconProps) {
  const Icon = ICONS[kind] || FolderSimple;
  return <Icon size={size} weight="regular" />;
}
