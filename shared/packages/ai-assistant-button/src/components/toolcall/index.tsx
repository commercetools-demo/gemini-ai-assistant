import { useEffect } from 'react';
import { FunctionResponse, LiveServerToolCall } from '@google/genai';
import { useLiveAPIContext } from '@commercetools-demo/ai-assistant-provider';
export default function Toolcall() {
  const { client, sdkTools, callSDKTool, callFrontendTool } = useLiveAPIContext();

  useEffect(() => {
    if (!client) {
      return;
    }
    const onToolCall = async (toolCall: LiveServerToolCall) => {
      if (!toolCall.functionCalls) {
        return;
      }
      const functionResponses: FunctionResponse[] = [];
      for (const tool of toolCall.functionCalls) {
        const { name: toolName, args: toolArguments } = tool;
        const sdkTool = sdkTools?.find((tool) => tool.name === toolName);
        if (toolName && sdkTool) {
          try {
            const result = await callSDKTool(toolName, toolArguments);
            functionResponses.push({
              id: tool.id,
              name: toolName,
              response: result,
            });
          } catch (error) {
            console.error('Error calling SDK tool:', error);
            functionResponses.push({
              id: tool.id,
              name: toolName,
              response: { error: 'Failed to execute tool' },
            });
          }
        } else {
          const result = await callFrontendTool(toolName, toolArguments);
          if (result) {
            functionResponses.push({
              id: tool.id,
              name: toolName,
              response: result,
            });
          }
        }
      }
      
      // Send all function responses back to the client
      if (functionResponses.length > 0) {
        client.sendToolResponse({
          functionResponses,
        });
      }
    };
    client.on('toolcall', onToolCall);
    return () => {
      client.off('toolcall', onToolCall);
    };
  }, [client, sdkTools]);

  // Return null to render nothing
  return null;
}
