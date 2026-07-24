// SPDX-License-Identifier: MIT

const prisma = require("../prisma");

const { ROLES } = require("../middleware/multiUserProtected");

async function getSearchableWorkspaces(user) {
  if (!user) return [];

  const elevated = [ROLES.admin, ROLES.manager].includes(user.role);

  return prisma.workspaces.findMany({
    where: elevated
      ? undefined
      : {
          workspace_users: {
            some: {
              user_id: user.id,
            },
          },
        },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      lastUpdatedAt: true,
    },
    orderBy: {
      lastUpdatedAt: "desc",
    },
  });
}

module.exports = {
  getSearchableWorkspaces,
};
