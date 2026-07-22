// SPDX-License-Identifier: MIT

import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import { ChatsCircle } from "@phosphor-icons/react/dist/csr/ChatsCircle";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { Note } from "@phosphor-icons/react/dist/csr/Note";
import { Sparkle } from "@phosphor-icons/react/dist/csr/Sparkle";
import type { GlobalSearchType } from "./types";

export default function SearchResultIcon({
  type,
}: {
  type: GlobalSearchType;
}) {
  const props = {
    size: 17,
    weight: "regular" as const,
  };

  switch (type) {
    case "workspace":
      return <BookOpen {...props} />;
    case "thread":
      return <ChatsCircle {...props} />;
    case "chat":
      return <ChatsCircle {...props} />;
    case "source":
      return <FileText {...props} />;
    case "note":
      return <Note {...props} />;
    case "artifact":
      return <Sparkle {...props} />;
    default:
      return <FolderOpen {...props} />;
  }
}
