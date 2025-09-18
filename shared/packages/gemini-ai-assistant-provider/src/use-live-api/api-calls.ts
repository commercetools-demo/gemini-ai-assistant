import { MCPContext } from "./frontend-types";

const getQueryString = (context?: MCPContext) => {
  const queryParams = new URLSearchParams(context as Record<string, string>);
  return queryParams.toString();
};

export const getGeminiEphemeralToken = async (baseUrl: string, context?: MCPContext) => {
  const response = await fetch(`${baseUrl}/get-ephemeral-token?${getQueryString(context)}`, {
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

export const getSDKTools = async (baseUrl: string, context?: MCPContext) => {
  const response = await fetch(`${baseUrl}/get-sdk-tools?${getQueryString(context)}`, {
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

export const getAIAgentProperties = async (baseUrl: string, context?: MCPContext) => {
  const response = await fetch(`${baseUrl}/get-ai-agent-properties?${getQueryString(context)}`, {
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

export const healthCheck = async (baseUrl: string, context?: MCPContext) => {
  const response = await fetch(`${baseUrl}/health-check?${getQueryString(context)}`, {
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
  toolArguments: any,
  context?: MCPContext
): Promise<Record<string, any>> => {
  const response = await fetch(`${baseUrl}/call-sdk-tool?${getQueryString(context)}`, {
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
