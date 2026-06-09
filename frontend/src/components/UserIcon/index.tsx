// SPDX-License-Identifier: MIT
import React, { memo } from "react";
import usePfp from "../../hooks/usePfp";
import UserDefaultPfp from "./user.svg";
import WorkspaceDefaultPfp from "./workspace.svg";

type UserIconProps = {
  role: "user" | string;
  user?: { uid?: string } | null;
};

const UserIcon = memo(({ role }: UserIconProps) => {
  const { pfp } = usePfp();

  return (
    <div
      className="relative w-[35px] h-[35px] rounded-full flex-shrink-0 overflow-hidden"
      data-testid="user-icon"
    >
      {role === "user" && <RenderUserPfp pfp={pfp} />}
      {role !== "user" && (
        <img
          src={WorkspaceDefaultPfp}
          alt="System profile picture"
          className="flex items-center justify-center rounded-full border-solid border border-white/40 light:border-theme-sidebar-border light:bg-theme-bg-chat-input"
        />
      )}
    </div>
  );
});

UserIcon.displayName = "UserIcon";

type RenderUserPfpProps = {
  pfp: string | null | undefined;
};

function RenderUserPfp({ pfp }: RenderUserPfpProps) {
  if (!pfp)
    return (
      <img
        src={UserDefaultPfp}
        alt="User profile picture"
        className="rounded-full border-none"
      />
    );

  return (
    <img
      src={pfp}
      alt="User profile picture"
      className="absolute top-0 left-0 w-full h-full object-cover rounded-full border-none"
    />
  );
}

export default UserIcon;
