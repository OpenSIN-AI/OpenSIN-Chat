// SPDX-License-Identifier: MIT
import UserButton from "./UserButton";

export default function UserMenu({ children }: any) {
  return (
    <div className="w-auto h-auto">
      <UserButton />
      {children}
    </div>
  );
}
