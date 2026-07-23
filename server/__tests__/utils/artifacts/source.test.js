// SPDX-License-Identifier: MIT

const mockDocument = {
  get: jest.fn(),
  addDocuments: jest.fn(),
};
const mockFsPromises = {
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  rename: jest.fn(),
  rm: jest.fn(),
};
const mockIsWithin = jest.fn(() => true);
const mockNormalizePath = jest.fn((value) => value);

jest.mock("fs", () => ({ promises: mockFsPromises }));
jest.mock("../../../models/documents", () => ({ Document: mockDocument }));
jest.mock("../../../utils/files", () => ({
  documentsPath: "/tmp/opensin-documents",
  isWithin: mockIsWithin,
  normalizePath: mockNormalizePath,
}));

const {
  addArtifactAsWorkspaceSource,
  documentPayloadForArtifact,
  textFromArtifact,
} = require("../../../utils/artifacts/source");

const artifact = {
  uuid: "artifact-123",
  title: "Research result",
  description: "Generated evidence",
  type: "text",
  mimeType: "text/plain",
  content: "One two three",
  storagePath: null,
  createdAt: "2026-07-23T10:00:00.000Z",
};
const workspace = { id: 4, slug: "research" };

describe("artifact source integration", () => {
  afterEach(() => jest.clearAllMocks());

  it("builds collector-compatible document metadata", () => {
    expect(documentPayloadForArtifact(artifact, artifact.content)).toEqual(
      expect.objectContaining({
        url: "artifact://artifact-123",
        chunkSource: "artifact://artifact-123",
        docSource: "artifact",
        wordCount: 3,
        pageContent: "One two three",
      }),
    );
  });

  it("does not decode binary artifacts as UTF-8 sources", () => {
    const readArtifact = jest.fn(() => Buffer.from([0xff, 0xd8, 0xff]));
    expect(
      textFromArtifact(
        {
          ...artifact,
          type: "image",
          mimeType: "image/jpeg",
          content: null,
          storagePath: "/tmp/image.jpg",
        },
        readArtifact,
      ),
    ).toBeNull();
    expect(readArtifact).not.toHaveBeenCalled();
  });

  it("returns the existing document without embedding twice", async () => {
    const existing = { docId: "doc-1", docpath: "artifacts/artifact-123.json" };
    mockDocument.get.mockResolvedValue(existing);

    const result = await addArtifactAsWorkspaceSource({
      artifact,
      workspace,
      userId: 8,
      readArtifact: jest.fn(),
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        document: existing,
        alreadyAdded: true,
      }),
    );
    expect(mockDocument.addDocuments).not.toHaveBeenCalled();
  });

  it("writes a source document and embeds it through the canonical path", async () => {
    const persisted = {
      docId: "doc-2",
      docpath: "artifacts/artifact-123.json",
    };
    mockDocument.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persisted);
    mockDocument.addDocuments.mockResolvedValue({
      failedToEmbed: [],
      errors: [],
      embedded: ["artifacts/artifact-123.json"],
    });

    const result = await addArtifactAsWorkspaceSource({
      artifact,
      workspace,
      userId: 8,
      readArtifact: jest.fn(),
    });

    expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("artifact-123.json"),
      expect.stringContaining('"pageContent":"One two three"'),
      "utf-8",
    );
    expect(mockDocument.addDocuments).toHaveBeenCalledWith(
      workspace,
      [expect.stringMatching(/artifacts[\\/]artifact-123\.json$/)],
      8,
    );
    expect(result).toEqual({
      success: true,
      code: 200,
      document: persisted,
      alreadyAdded: false,
    });
  });
});
