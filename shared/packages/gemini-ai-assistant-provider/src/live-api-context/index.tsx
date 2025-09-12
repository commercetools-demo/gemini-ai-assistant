import { createContext, FC, ReactNode, useContext } from "react";
import { useLiveAPI, UseLiveAPIResults } from "../use-live-api";
import { FrontendTool } from "../use-live-api/frontend-types";
import { LoggerProvider } from "../use-store-logger";
import LogListener from "../log-listener";

const LiveAPIContext = createContext<UseLiveAPIResults | undefined>(undefined);

export type LiveAPIProviderProps = {
  baseUrl: string;
  frontEndTools?: FrontendTool[];
  children: ReactNode;
};

export const LiveAPIProvider: FC<LiveAPIProviderProps> = ({
  children,
  baseUrl,
  frontEndTools,
}) => {
  const liveAPI = useLiveAPI(baseUrl, frontEndTools);

  return (
    <LoggerProvider>
      <LiveAPIContext.Provider value={liveAPI}>
        {children}
        <LogListener />
      </LiveAPIContext.Provider>
    </LoggerProvider>
  );
};

export const useLiveAPIContext = () => {
  const context = useContext(LiveAPIContext);
  if (!context) {
    throw new Error("useLiveAPIContext must be used wihin a LiveAPIProvider");
  }
  return context;
};
