jest.mock("../../../utils/prisma", () => ({
  workspaces: {
    findMany: jest.fn(),
  },
}));

const prisma = require("../../../utils/prisma");
const { getSearchableWorkspaces } = require("../../../utils/globalSearch/access");

describe("global search access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.workspaces.findMany.mockResolvedValue([]);
  });

  it("restricts normal users by workspace membership", async () => {
    await getSearchableWorkspaces({ id: 42, role: "default" });

    expect(prisma.workspaces.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspace_users: {
            some: {
              user_id: 42,
            },
          },
        },
      }),
    );
  });

  it("allows admins to search all workspaces", async () => {
    await getSearchableWorkspaces({ id: 1, role: "admin" });

    expect(prisma.workspaces.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
      }),
    );
  });
});
