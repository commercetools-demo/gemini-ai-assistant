import { Request, Response } from 'express';
import { logger } from '../utils/logger.utils';
import { getAIAgentInstance } from '../utils/ai-agent.utils';

/**
 * Get Gemini ephemeral token
 */
export const getGeminiEphemeralToken = async (req: Request, res: Response) => {
  try {
    logger.info('Getting Gemini ephemeral token');

    const aiAgent = getAIAgentInstance();
    const token = await aiAgent.getEphemeralToken();

    res.status(200).json({
      token,
    });
  } catch (error) {
    logger.error('Error getting ephemeral token:', error);
    res.status(500).json({
      error: 'Failed to get ephemeral token',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get SDK tools
 */
export const getSDKTools = async (req: Request, res: Response) => {
  try {
    logger.info('Getting SDK tools');

    const aiAgent = getAIAgentInstance();
    const tools = await aiAgent.getSDKTools();

    res.status(200).json(tools);
  } catch (error) {
    logger.error('Error getting SDK tools:', error);
    res.status(500).json({
      error: 'Failed to get SDK tools',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get AI Agent properties
 */
export const getAIAgentProperties = async (req: Request, res: Response) => {
  try {
    logger.info('Getting AI Agent properties');

    const properties = {
      model: process.env.AI_MODEL,
      voice: process.env.AI_VOICE,
    };

    res.status(200).json(properties);
  } catch (error) {
    logger.error('Error getting AI agent properties:', error);
    res.status(500).json({
      error: 'Failed to get AI agent properties',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Health check
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    logger.info('Performing health check');

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    logger.error('Error in health check:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Call SDK tool
 */
export const callSDKTool = async (req: Request, res: Response) => {
  try {
    const { toolName, toolArguments } = req.body;

    if (!toolName) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'toolName is required',
      });
    }

    logger.info(`Calling SDK tool: ${toolName}`, toolArguments);

    const aiAgent = getAIAgentInstance();
    const result = await aiAgent.callSDKTool(toolName, toolArguments || {});
    if (typeof result !== 'string') {
      return res.status(200).json(result);
    }
    const parsedResult = JSON.parse(result);
    if (typeof parsedResult !== 'string') {
      return res.status(200).json(parsedResult);
    }
    res.status(200).json(JSON.parse(parsedResult));
  } catch (error) {
    logger.error('Error calling SDK tool:', error);
    res.status(500).json({
      error: 'Failed to call SDK tool',
      message: error instanceof Error ? error.message : 'Unknown error',
      toolName: req.body?.toolName,
    });
  }
};
