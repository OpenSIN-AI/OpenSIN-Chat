// SPDX-License-Identifier: MIT

import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { FileImage } from "@phosphor-icons/react/dist/csr/FileImage";
import { FileCode } from "@phosphor-icons/react/dist/csr/FileCode";
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";
import { SpeakerHigh } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { VideoCamera } from "@phosphor-icons/react/dist/csr/VideoCamera";
import { BracketsCurly } from "@phosphor-icons/react/dist/csr/BracketsCurly";
import type { ArtifactType } from "./types";

export default function ArtifactIcon({ type }: { type: ArtifactType }) {
  const props = { size: 18, weight: "regular" as const };

  switch (type) {
    case "image":
      return <FileImage {...props} />;
    case "audio":
      return <SpeakerHigh {...props} />;
    case "video":
      return <VideoCamera {...props} />;
    case "pdf":
      return <FilePdf {...props} />;
    case "code":
      return <FileCode {...props} />;
    case "json":
      return <BracketsCurly {...props} />;
    default:
      return <FileText {...props} />;
  }
}
