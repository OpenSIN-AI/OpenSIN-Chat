// SPDX-License-Identifier: MIT
const FLOW_TYPES = {
  START: {
    type: "start",
    description: "Initialize flow variables",
    parameters: {
      variables: {
        type: "array",
        description: "List of variables to initialize",
      },
    },
  },
  API_CALL: {
    type: "apiCall",
    description: "Make an HTTP request to an API endpoint",
    parameters: {
      url: { type: "string", description: "The URL to make the request to" },
      method: { type: "string", description: "HTTP method (GET, POST, etc.)" },
      headers: {
        type: "array",
        description: "Request headers as key-value pairs",
      },
      bodyType: {
        type: "string",
        description: "Type of request body (json, form)",
      },
      body: {
        type: "string",
        description:
          "Request body content. If body type is json, always return a valid json object. If body type is form, always return a valid form data object.",
      },
      formData: { type: "array", description: "Form data as key-value pairs" },
      responseVariable: {
        type: "string",
        description: "Variable to store the response",
      },
      directOutput: {
        type: "boolean",
        description:
          "Whether to return the response directly to the user without LLM processing",
      },
    },
    examples: [
      {
        url: "https://api.example.com/data",
        method: "GET",
        headers: [{ key: "Authorization", value: "Bearer 1234567890" }],
      },
    ],
  },
  LLM_INSTRUCTION: {
    type: "llmInstruction",
    description: "Process data using LLM instructions",
    parameters: {
      instruction: {
        type: "string",
        description: "The instruction for the LLM to follow",
      },
      resultVariable: {
        type: "string",
        description: "Variable to store the processed result",
      },
    },
  },
  WEB_SCRAPING: {
    type: "webScraping",
    description: "Scrape content from a webpage",
    parameters: {
      url: {
        type: "string",
        description: "The URL of the webpage to scrape",
      },
      resultVariable: {
        type: "string",
        description: "Variable to store the scraped content",
      },
      directOutput: {
        type: "boolean",
        description:
          "Whether to return the scraped content directly to the user without LLM processing",
      },
    },
  },
  WEBSITE: {
    type: "website",
    description: "Navigate to a URL and interact with the page",
    parameters: {
      url: { type: "string", description: "The URL to navigate to" },
      selector: { type: "string", description: "CSS selector for the element" },
      action: { type: "string", description: "Action to perform (read, click, type)" },
      value: { type: "string", description: "Value for type action" },
      resultVariable: { type: "string", description: "Variable to store the result" },
    },
  },
  FILE: {
    type: "file",
    description: "Read or write to a file",
    parameters: {
      path: { type: "string", description: "The file path" },
      operation: { type: "string", description: "Operation to perform (read, write)" },
      content: { type: "string", description: "Content to write" },
      resultVariable: { type: "string", description: "Variable to store the result" },
    },
  },
  CODE: {
    type: "code",
    description: "Execute code snippets",
    parameters: {
      language: { type: "string", description: "Programming language" },
      code: { type: "string", description: "Code to execute" },
      resultVariable: { type: "string", description: "Variable to store the result" },
    },
  },
};

module.exports.FLOW_TYPES = FLOW_TYPES;
