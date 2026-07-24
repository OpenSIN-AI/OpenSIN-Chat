// SPDX-License-Identifier: MIT

const mockCreateArtifact = jest.fn();
const mockStoreBuffer = jest.fn(() => ({
  uuid: "stored-file-id",
  storagePath: "/tmp/artifacts/stored-file-id.jpg",
}));
const mockStoreJson = jest.fn(() => ({
  uuid: "stored-json-id",
  storagePath: "/tmp/artifacts/stored-json-id.json",
}));

jest.mock("../../../models/workspaceArtifact", () => ({
  createArtifact: mockCreateArtifact,
}));
jest.mock("../../../utils/artifacts/storage", () => ({
  storeBuffer: mockStoreBuffer,
  storeJson: mockStoreJson,
}));

const {
  createArtifactsFromOutputs,
  decodeArtifactData,
} = require("../../../utils/artifacts/fromChat");

describe("artifact output conversion", () => {
  afterEach(() => jest.clearAllMocks());

  it("decodes base64 data URLs and preserves their MIME type", () => {
    const result = decodeArtifactData(
      "data:image/jpeg;base64,aGVsbG8=",
      "image/png",
    );

    expect(result.buffer.toString("utf-8")).toBe("hello");
    expect(result.mimeType).toBe("image/jpeg");
  });

  it("stores binary outputs using the actual MIME type", async () => {
    mockCreateArtifact.mockImplementation(async (input) => ({
      uuid: "artifact-id",
      ...input,
    }));

    const artifacts = await createArtifactsFromOutputs({
      workspaceId: 4,
      threadId: 7,
      chatId: 8,
      userId: 9,
      turnId: "turn-1",
      outputs: [
        {
          title: "Photo",
          data: "data:image/jpeg;base64,aGVsbG8=",
        },
      ],
    });

    expect(mockStoreBuffer).toHaveBeenCalledWith(
      4,
      "image",
      expect.any(Buffer),
      "image/jpeg",
    );
    expect(mockCreateArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 4,
        type: "image",
        mimeType: "image/jpeg",
        storagePath: "/tmp/artifacts/stored-file-id.jpg",
      }),
    );
    expect(artifacts).toHaveLength(1);
  });

  it("keeps inline text as content without creating a file", async () => {
    mockCreateArtifact.mockImplementation(async (input) => ({
      uuid: "artifact-id",
      ...input,
    }));

    await createArtifactsFromOutputs({
      workspaceId: 1,
      outputs: [{ type: "text", title: "Note", content: "Evidence" }],
    });

    expect(mockStoreBuffer).not.toHaveBeenCalled();
    expect(mockCreateArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "text",
        content: "Evidence",
        mimeType: "text/plain",
      }),
    );
  });
});
