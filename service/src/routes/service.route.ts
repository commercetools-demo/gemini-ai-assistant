import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.utils';
import {
  getGeminiEphemeralToken,
  getSDKTools,
  getAIAgentProperties,
  healthCheck,
  callSDKTool
} from '../controllers/ai-agent.controller';

const serviceRouter = Router();

// AI Agent API wrapper routes
serviceRouter.get('/get-ephemeral-token', async (req: Request, res: Response, next: NextFunction) => {
  logger.info('Get ephemeral token request received');

  try {
    await getGeminiEphemeralToken(req, res);
  } catch (error) {
    next(error);
  }
});

serviceRouter.get('/get-sdk-tools', async (req: Request, res: Response, next: NextFunction) => {
  logger.info('Get SDK tools request received');

  try {
    await getSDKTools(req, res);
  } catch (error) {
    next(error);
  }
});

serviceRouter.get('/get-ai-agent-properties', async (req: Request, res: Response, next: NextFunction) => {
  logger.info('Get AI agent properties request received');

  try {
    await getAIAgentProperties(req, res);
  } catch (error) {
    next(error);
  }
});

serviceRouter.get('/health-check', async (req: Request, res: Response, next: NextFunction) => {
  logger.info('Health check request received');

  try {
    await healthCheck(req, res);
  } catch (error) {
    next(error);
  }
});

serviceRouter.post('/call-sdk-tool', async (req: Request, res: Response, next: NextFunction) => {
  logger.info('Call SDK tool request received');

  console.log('Call SDK tool request received', req.body);

  try {
    await callSDKTool(req, res);
  } catch (error) {
    next(error);
  }
});

export default serviceRouter;
