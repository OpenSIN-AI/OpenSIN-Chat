// SPDX-License-Identifier: MIT
import { titleCase } from "text-case";

interface WorkspaceMemberRowProps {
  user: { username: string; role: string; lastUpdatedAt: string };
}

export default function WorkspaceMemberRow({ user }: WorkspaceMemberRowProps) {
  return (
    <>
      <tr className="bg-transparent text-theme-text-primary text-sm font-medium">
        <th scope="row" className="px-6 py-4 whitespace-nowrap">
          {user.username}
        </th>
        <td className="px-6 py-4">{titleCase(user.role)}</td>
        <td className="px-6 py-4">{user.lastUpdatedAt}</td>
      </tr>
    </>
  );
}
