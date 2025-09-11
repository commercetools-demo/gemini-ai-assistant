import { logger } from './logger.utils';
import { CommercetoolsAgentEssentials } from '@commercetools/agent-essentials/langchain';
import { AuthToken, FunctionDeclaration, GoogleGenAI, Modality } from '@google/genai';
import { getExecutableTools } from './tools';
import { parseStringifiedJson } from './parse-actions';

interface ClientConfig {
  apiKey: string;
  model: string;
  voice: string;
}

interface CommercetoolsConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  projectKey: string;
  apiUrl: string;
}

/**
 * Read AI Agent configuration from environment variables
 */
const readAIAgentConfiguration = (): ClientConfig => {
  return {
    apiKey: process.env.GOOGLE_AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-pro',
    voice: process.env.AI_VOICE || 'default',
  };
};

/**
 * Read Commercetools configuration from environment variables
 */
const readCommercetoolsConfiguration = (): CommercetoolsConfig => {
  return {
    clientId: process.env.CTP_CLIENT_ID || '',
    clientSecret: process.env.CTP_CLIENT_SECRET || '',
    authUrl: process.env.CTP_AUTH_URL || `https://auth.${process.env.CTP_REGION || 'us-central1'}.commercetools.com`,
    projectKey: process.env.CTP_PROJECT_KEY || '',
    apiUrl: process.env.CTP_API_URL || process.env.CTP_HOST_URL || `https://api.${process.env.CTP_REGION || 'us-central1'}.commercetools.com`,
  };
};

export class AIAgentApi {
  private readonly config: ClientConfig;
  private readonly clientSettings: CommercetoolsConfig;
  private readonly toolkit: CommercetoolsAgentEssentials;

  constructor() {
    // Get configuration from environment variables
    this.config = readAIAgentConfiguration();
    this.clientSettings = readCommercetoolsConfiguration();
    
    logger.info('Initializing AI Agent with configuration', {
      model: this.config.model,
      voice: this.config.voice,
      projectKey: this.clientSettings.projectKey,
      hasApiKey: !!this.config.apiKey
    });

    const availableActions = parseStringifiedJson(
      process.env.AVAILABLE_TOOLS
    );

    this.toolkit = new CommercetoolsAgentEssentials({
      authConfig: {
        type: 'client_credentials',
        clientId: this.clientSettings.clientId,
        clientSecret: this.clientSettings.clientSecret,
        authUrl: this.clientSettings.authUrl,
        projectKey: this.clientSettings.projectKey,
        apiUrl: this.clientSettings.apiUrl,
      },
      configuration: {
          actions: availableActions
      },
    });
  }

  async getSDKTools() {
    const ctToolsFromSDK = this.toolkit.getTools();
    const allFormattedTools = getExecutableTools(ctToolsFromSDK);
    return allFormattedTools;
  }

  async getEphemeralToken() {
    const client = new GoogleGenAI({
      apiKey: this.config.apiKey,
    });

    const allFormattedTools = await this.getSDKTools();

    const frontendTools: any = parseStringifiedJson(
      process.env.FRONTEND_TOOLS
    );

    
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token: AuthToken = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: expireTime, // Default is 30 mins
        newSessionExpireTime: new Date(Date.now() + 1 * 60 * 1000).toISOString(), // Default 1 minute in the future
        httpOptions: { apiVersion: 'v1alpha' },
        liveConnectConstraints: {
          model: this.config.model,
          config: {
            responseModalities: [Modality.AUDIO],
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            tools: [{ functionDeclarations: [...allFormattedTools, ...frontendTools] }],
          },
        },
      },
    });

    return token.name;
  }

  async callSDKTool(toolName: string, toolArguments: any) {
    const ctToolsFromSDK = this.toolkit.getTools();
    const tool = ctToolsFromSDK.find((tool: any) => tool.name === toolName);
    
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    switch (toolName) {
      case 'search_products':
        return tool.func({
          ...toolArguments,
          ...(toolArguments.productProjectionParameters
            ? { productProjectionParameters: toolArguments.productProjectionParameters }
            : { productProjectionParameters: {} }),
        });
      default:
        return tool.func(toolArguments);
    }
  }
}

// Create a singleton instance
let aiAgentInstance: AIAgentApi | null = null;

export const getAIAgentInstance = () => {
  if (!aiAgentInstance) {
    aiAgentInstance = new AIAgentApi();
  }
  return aiAgentInstance;
};
