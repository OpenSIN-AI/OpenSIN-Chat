// SPDX-License-Identifier: MIT
/* eslint-env jest */

const Provider = require("../../../../../utils/agents/aibitat/providers/ai-provider.js");
const {
  formatMessagesForTools,
} = require("../../../../../utils/agents/aibitat/providers/helpers/tooled.js");

describe("agent attachment formatting", () => {
  const documentMessage = {
    role: "user",
    content: "Use the collected source.",
    attachments: [
      {
        name: "example.com.txt",
        mime: "text/plain",
        contentString: "Example Domain source text",
      },
    ],
  };

  const expectedDocumentContent = [
    { type: "text", text: "Use the collected source." },
    {
      type: "text",
      text: "[Attached document: example.com.txt]\nExample Domain source text",
    },
  ];

  it("serializes scraped document attachments as text in the base provider", () => {
    const provider = new Provider();

    expect(provider.formatMessageWithAttachments(documentMessage)).toEqual({
      role: "user",
      content: expectedDocumentContent,
    });
  });

  it("serializes scraped document attachments as text for native tools", () => {
    expect(formatMessagesForTools([documentMessage])).toEqual([
      {
        role: "user",
        content: expectedDocumentContent,
      },
    ]);
  });

  it("keeps genuine image data URLs as image attachments", () => {
    const imageMessage = {
      role: "user",
      content: "Describe this image.",
      attachments: [
        {
          name: "image.png",
          mime: "image/png",
          contentString: "data:image/png;base64,AAAA",
        },
      ],
    };

    expect(formatMessagesForTools([imageMessage])).toEqual([
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this image." },
          {
            type: "image_url",
            image_url: { url: "data:image/png;base64,AAAA" },
          },
        ],
      },
    ]);
  });
});
