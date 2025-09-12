import { FrontendTool } from "./frontend-types";

export const getGeminiEphemeralToken = async (baseUrl: string) => {
  const response = await fetch(`${baseUrl}/get-ephemeral-token`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to get Gemini ephemeral token");
  }
  return response.json();
};

export const getSDKTools = async (baseUrl: string) => {
  const response = await fetch(`${baseUrl}/get-sdk-tools`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to get SDK tools");
  }
  return response.json();
};

export const getAIAgentProperties = async (baseUrl: string) => {
  const response = await fetch(`${baseUrl}/get-ai-agent-properties`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to get AIAgent properties");
  }
  return response.json();
};

export const healthCheck = async (baseUrl: string) => {
  const response = await fetch(`${baseUrl}/health-check`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to health check");
  }
  return response.json();
};

export const callSDKTool = async (
  baseUrl: string,
  toolName: string,
  toolArguments: any
): Promise<Record<string, any>> => {
  const response = await fetch(`${baseUrl}/call-sdk-tool`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ toolName, toolArguments }),
  });
  if (!response.ok) {
    throw new Error("Failed to call SDK tool");
  }
  return response.json();
};
