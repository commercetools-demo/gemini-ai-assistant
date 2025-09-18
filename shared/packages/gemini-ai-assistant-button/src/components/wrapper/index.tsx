import {
    FrontendTool,
    LiveAPIProvider,
    MCPContext,
} from "@commercetools-demo/gemini-ai-assistant-provider";
import ControlTray from "../control-tray";

type Props = {
  baseUrl: string;
  frontEndTools: FrontendTool[];
  systemInstruction?: string;
  context?: MCPContext;
};

const AIAssistantWrapper = (props: Props) => {
  return (
    <LiveAPIProvider
      baseUrl={props.baseUrl}
      frontEndTools={props.frontEndTools}
      systemInstruction={props.systemInstruction}
      context={props.context}
    >
      <ControlTray />
    </LiveAPIProvider>
  );
};

export default AIAssistantWrapper;
