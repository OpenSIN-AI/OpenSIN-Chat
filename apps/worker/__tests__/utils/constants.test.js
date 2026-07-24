// SPDX-License-Identifier: MIT
/* eslint-env jest, node */
const {
  WATCH_DIRECTORY,
  ACCEPTED_MIMES,
  SUPPORTED_FILETYPE_CONVERTERS,
} = require("../../utils/constants");

describe("WATCH_DIRECTORY", () => {
  it("is a string ending with hotdir", () => {
    expect(typeof WATCH_DIRECTORY).toBe("string");
    expect(WATCH_DIRECTORY.endsWith("hotdir")).toBe(true);
  });
});

describe("ACCEPTED_MIMES", () => {
  it("contains text/plain MIME type", () => {
    expect(ACCEPTED_MIMES["text/plain"]).toBeDefined();
    expect(ACCEPTED_MIMES["text/plain"]).toContain(".txt");
    expect(ACCEPTED_MIMES["text/plain"]).toContain(".md");
  });

  it("contains application/pdf MIME type", () => {
    expect(ACCEPTED_MIMES["application/pdf"]).toBeDefined();
    expect(ACCEPTED_MIMES["application/pdf"]).toContain(".pdf");
  });

  it("contains audio/mpeg MIME type", () => {
    expect(ACCEPTED_MIMES["audio/mpeg"]).toBeDefined();
    expect(ACCEPTED_MIMES["audio/mpeg"]).toContain(".mp3");
  });

  it("contains image MIME types", () => {
    expect(ACCEPTED_MIMES["image/png"]).toBeDefined();
    expect(ACCEPTED_MIMES["image/jpeg"]).toBeDefined();
  });

  it("contains office document MIME types", () => {
    const docx =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const pptx =
      "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    const xlsx =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    expect(ACCEPTED_MIMES[docx]).toBeDefined();
    expect(ACCEPTED_MIMES[pptx]).toBeDefined();
    expect(ACCEPTED_MIMES[xlsx]).toBeDefined();
    expect(ACCEPTED_MIMES[docx]).toContain(".docx");
    expect(ACCEPTED_MIMES[pptx]).toContain(".pptx");
    expect(ACCEPTED_MIMES[xlsx]).toContain(".xlsx");
  });
});

describe("SUPPORTED_FILETYPE_CONVERTERS", () => {
  it("maps .pdf to asPDF converter", () => {
    expect(SUPPORTED_FILETYPE_CONVERTERS[".pdf"]).toBe(
      "./convert/asPDF/index.js"
    );
  });

  it("maps .docx to asDocx converter", () => {
    expect(SUPPORTED_FILETYPE_CONVERTERS[".docx"]).toBe("./convert/asDocx.js");
  });

  it("maps text extensions to asTxt converter", () => {
    expect(SUPPORTED_FILETYPE_CONVERTERS[".txt"]).toBe("./convert/asTxt.js");
    expect(SUPPORTED_FILETYPE_CONVERTERS[".md"]).toBe("./convert/asTxt.js");
    expect(SUPPORTED_FILETYPE_CONVERTERS[".csv"]).toBe("./convert/asTxt.js");
  });

  it("maps audio extensions to asAudio converter", () => {
    expect(SUPPORTED_FILETYPE_CONVERTERS[".mp3"]).toBe("./convert/asAudio.js");
    expect(SUPPORTED_FILETYPE_CONVERTERS[".wav"]).toBe("./convert/asAudio.js");
    expect(SUPPORTED_FILETYPE_CONVERTERS[".m4a"]).toBe("./convert/asAudio.js");
    expect(SUPPORTED_FILETYPE_CONVERTERS[".webm"]).toBe("./convert/asAudio.js");
  });

  it("maps image extensions to asImage converter", () => {
    expect(SUPPORTED_FILETYPE_CONVERTERS[".png"]).toBe("./convert/asImage.js");
    expect(SUPPORTED_FILETYPE_CONVERTERS[".jpg"]).toBe("./convert/asImage.js");
    expect(SUPPORTED_FILETYPE_CONVERTERS[".jpeg"]).toBe("./convert/asImage.js");
    expect(SUPPORTED_FILETYPE_CONVERTERS[".webp"]).toBe("./convert/asImage.js");
  });

  it("maps .xlsx to asXlsx converter", () => {
    expect(SUPPORTED_FILETYPE_CONVERTERS[".xlsx"]).toBe("./convert/asXlsx.js");
  });

  it("maps .epub to asEPub converter", () => {
    expect(SUPPORTED_FILETYPE_CONVERTERS[".epub"]).toBe("./convert/asEPub.js");
  });
});
