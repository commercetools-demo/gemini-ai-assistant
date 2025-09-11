import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { StreamingLog } from "../use-live-api/types";

interface LoggerContextState {
  maxLogs: number;
  logs: StreamingLog[];
  log: (streamingLog: StreamingLog) => void;
  clearLogs: () => void;
  setMaxLogs: (n: number) => void;
}

const LoggerContext = createContext<LoggerContextState | undefined>(undefined);

interface LoggerProviderProps {
  children: ReactNode;
  initialMaxLogs?: number;
}

export const LoggerProvider: React.FC<LoggerProviderProps> = ({ 
  children, 
  initialMaxLogs = 100 
}) => {
  const [maxLogs, setMaxLogs] = useState<number>(initialMaxLogs);
  const [logs, setLogs] = useState<StreamingLog[]>([]);

  const log = useCallback(({ date, type, message }: StreamingLog) => {
    setLogs((prevLogs) => {
      const prevLog = prevLogs.at(-1);
      
      // Check if the last log is identical - if so, increment count
      if (prevLog && prevLog.type === type && prevLog.message === message) {
        return [
          ...prevLogs.slice(0, -1),
          {
            date,
            type,
            message,
            count: prevLog.count ? prevLog.count + 1 : 2,
          } as StreamingLog,
        ];
      }
      
      // Add new log and limit to maxLogs
      return [
        ...prevLogs.slice(-(maxLogs - 1)),
        {
          date,
          type,
          message,
        } as StreamingLog,
      ];
    });
  }, [maxLogs]);

  const clearLogs = useCallback(() => {
    console.log("clear log");
    setLogs([]);
  }, []);

  const value: LoggerContextState = {
    maxLogs,
    logs,
    log,
    clearLogs,
    setMaxLogs,
  };

  return React.createElement(
    LoggerContext.Provider,
    { value },
    children
  );
};

export const useLoggerStore = (): LoggerContextState => {
  const context = useContext(LoggerContext);
  if (context === undefined) {
    throw new Error("useLoggerStore must be used within a LoggerProvider");
  }
  return context;
};
