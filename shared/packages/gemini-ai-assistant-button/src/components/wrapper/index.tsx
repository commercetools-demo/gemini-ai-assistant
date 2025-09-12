import {
    FrontendTool,
    LiveAPIProvider,
} from "@commercetools-demo/gemini-ai-assistant-provider";
import ControlTray from "../control-tray";

type Props = {
  baseUrl: string;
  frontEndTools: FrontendTool[];
};

const AIAssistantWrapper = (props: Props) => {
  return (
    <LiveAPIProvider
      baseUrl={props.baseUrl}
      frontEndTools={props.frontEndTools}
    >
      <ControlTray />
    </LiveAPIProvider>
  );
};

export default AIAssistantWrapper;
