/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { memo, ReactNode } from "react";
import styled, { css } from "styled-components";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs2015 as dark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import {
  useLoggerStore,
  ClientContentLog as ClientContentLogType,
  StreamingLog,
} from "@commercetools-demo/gemini-ai-assistant-provider";
import {
  Content,
  LiveClientToolResponse,
  LiveServerContent,
  LiveServerToolCall,
  LiveServerToolCallCancellation,
  Part,
} from "@google/genai";

// Styled Components
const LoggerContainer = styled.div`
  color: var(--gray-300);
  width: 100%;
  max-width: 100%;
  display: block;
`;

const LoggerList = styled.ul`
  padding: 0 0px 0 25px;
  overflow-x: hidden;
  width: calc(100% - 45px);
`;

const LoggerItem = styled.li<{ $isServer?: boolean; $isClient?: boolean; $isReceive?: boolean; $isSend?: boolean }>`
  display: block;
  padding: 8px 0;
  color: var(--Neutral-50, #707577);
  font-family: "Space Mono";
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;

  ${props => props.$isServer && css`
    color: var(--Blue-500);
  `}

  ${props => props.$isReceive && css`
    color: var(--Blue-500);
  `}

  ${props => props.$isClient && css`
    color: var(--Green-500);
  `}

  ${props => props.$isSend && !props.$isServer && css`
    color: var(--Green-500);
  `}

  .timestamp {
    width: 70px;
    flex-grow: 0;
    flex-shrink: 0;
    color: var(--Neutral-50);
  }

  .source {
    flex-shrink: 0;
    font-weight: bold;
  }

  .count {
    background-color: var(--Neutral-5);
    font-size: x-small;
    padding: 0em 0.6em;
    padding: 0.3em 0.5em;
    line-height: 1em;
    vertical-align: middle;
    border-radius: 8px;
    color: var(--Blue-500);
  }

  .message {
    flex-grow: 1;
    color: var(--Neutral-50);
  }

  &.plain-log > * {
    padding-right: 4px;
  }
`;

const RichLog = styled.div<{ $isUser?: boolean; $isModel?: boolean }>`
  display: flex;
  justify-content: center;
  gap: 4px;
  display: block;

  pre {
    overflow-x: auto;
  }

  h4 {
    font-size: 14px;
    text-transform: uppercase;
    padding: 8px 0;
    margin: 0;
    
    ${props => props.$isUser && css`
      color: var(--Green-500);
    `}
    
    ${props => props.$isModel && css`
      color: var(--Blue-500);
    `}
  }

  h5 {
    margin: 0;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--Neutral-20);
  }

  .part {
    background: var(--Neutral-5);
    padding: 14px;
    margin-bottom: 4px;
    color: var(--Neutral-90);
    border-radius: 8px;
  }
`;

const InlineCode = styled.span`
  font-style: italic;

  &:not(:last-child)::after {
    content: ", ";
  }
`;

const formatTime = (d: Date) => d.toLocaleTimeString().slice(0, -3);

const LogEntry = memo(
  ({
    log,
    MessageComponent,
  }: {
    log: StreamingLog;
    MessageComponent: ({
      message,
    }: {
      message: StreamingLog["message"];
    }) => ReactNode;
  }): ReactNode => {
    const sourceType = log.type.slice(0, log.type.indexOf("."));
    const isServer = sourceType === "server";
    const isClient = sourceType === "client";
    const isReceive = log.type.includes("receive");
    const isSend = log.type.includes("send");

    return (
      <LoggerItem 
        $isServer={isServer}
        $isClient={isClient}
        $isReceive={isReceive}
        $isSend={isSend}
        className="plain-log"
      >
        <span className="timestamp">{formatTime(log.date)}</span>
        <span className="source">{log.type}</span>
        <span className="message">
          <MessageComponent message={log.message} />
        </span>
        {log.count && <span className="count">{log.count}</span>}
      </LoggerItem>
    );
  }
);

const PlainTextMessage = ({
  message,
}: {
  message: StreamingLog["message"];
}) => <span>{message as string}</span>;

type Message = { message: StreamingLog["message"] };

const AnyMessage = ({ message }: Message) => (
  <pre>{JSON.stringify(message, null, "  ")}</pre>
);

function tryParseCodeExecutionResult(output: string) {
  try {
    const json = JSON.parse(output);
    return JSON.stringify(json, null, "  ");
  } catch (e) {
    return output;
  }
}

const RenderPart = memo(({ part }: { part: Part }) => {
  if (part.text && part.text.length) {
    return <p className="part part-text">{part.text}</p>;
  }
  if (part.executableCode) {
    return (
      <div className="part part-executableCode">
        <h5>executableCode: {part.executableCode.language}</h5>
        <SyntaxHighlighter
          language={part.executableCode!.language!.toLowerCase()}
          style={dark}
        >
          {part.executableCode!.code!}
        </SyntaxHighlighter>
      </div>
    );
  }
  if (part.codeExecutionResult) {
    return (
      <div className="part part-codeExecutionResult">
        <h5>codeExecutionResult: {part.codeExecutionResult!.outcome}</h5>
        <SyntaxHighlighter language="json" style={dark}>
          {tryParseCodeExecutionResult(part.codeExecutionResult!.output!)}
        </SyntaxHighlighter>
      </div>
    );
  }
  if (part.inlineData) {
    return (
      <div className="part part-inlinedata">
        <h5>Inline Data: {part.inlineData?.mimeType}</h5>
      </div>
    );
  }
  return <div className="part part-unknown">&nbsp;</div>;
});

const ClientContentLog = memo(({ message }: Message) => {
  const { turns, turnComplete } = message as ClientContentLogType;
  const textParts = turns.filter((part) => !(part.text && part.text === "\n"));
  return (
    <RichLog $isUser={true} className="client-content user">
      <h4 className="roler-user">User</h4>
      <div key={`message-turn`}>
        {textParts.map((part, j) => (
          <RenderPart part={part} key={`message-part-${j}`} />
        ))}
      </div>
      {!turnComplete ? <span>turnComplete: false</span> : ""}
    </RichLog>
  );
});

const ToolCallLog = memo(({ message }: Message) => {
  const { toolCall } = message as { toolCall: LiveServerToolCall };
  return (
    <RichLog className="tool-call">
      {toolCall.functionCalls?.map((fc) => (
        <div key={fc.id} className="part part-functioncall">
          <h5>Function call: {fc.name}</h5>
          <SyntaxHighlighter language="json" style={dark}>
            {JSON.stringify(fc, null, "  ")}
          </SyntaxHighlighter>
        </div>
      ))}
    </RichLog>
  );
});

const ToolCallCancellationLog = ({ message }: Message): ReactNode => (
  <RichLog className="tool-call-cancellation">
    <span>
      {" "}
      ids:{" "}
      {(
        message as { toolCallCancellation: LiveServerToolCallCancellation }
      ).toolCallCancellation.ids?.map((id) => (
        <InlineCode key={`cancel-${id}`}>
          "{id}"
        </InlineCode>
      ))}
    </span>
  </RichLog>
);

const ToolResponseLog = memo(
  ({ message }: Message): ReactNode => (
    <RichLog className="tool-response">
      {(message as LiveClientToolResponse).functionResponses?.map((fc) => (
        <div key={`tool-response-${fc.id}`} className="part">
          <h5>Function Response: {fc.id}</h5>
          <SyntaxHighlighter language="json" style={dark}>
            {JSON.stringify(fc.response, null, "  ")}
          </SyntaxHighlighter>
        </div>
      ))}
    </RichLog>
  )
);

const ModelTurnLog = ({ message }: Message): ReactNode => {
  const serverContent = (message as { serverContent: LiveServerContent })
    .serverContent;
  const { modelTurn } = serverContent as { modelTurn: Content };
  const { parts } = modelTurn;

  return (
    <RichLog $isModel={true} className="model-turn model">
      <h4 className="role-model">Model</h4>
      {parts
        ?.filter((part) => !(part.text && part.text === "\n"))
        .map((part, j) => (
          <RenderPart part={part} key={`model-turn-part-${j}`} />
        ))}
    </RichLog>
  );
};

const CustomPlainTextLog = (msg: string) => () =>
  <PlainTextMessage message={msg} />;

export type LoggerFilterType = "conversations" | "tools" | "none" | "transcription";

export type LoggerProps = {
  filter: LoggerFilterType;
};

const filters: Record<LoggerFilterType, (log: StreamingLog) => boolean> = {
  tools: (log: StreamingLog) =>
    typeof log.message === "object" &&
    ("toolCall" in log.message ||
      "functionResponses" in log.message ||
      "toolCallCancellation" in log.message),
  conversations: (log: StreamingLog) =>
    typeof log.message === "object" &&
    (("turns" in log.message && "turnComplete" in log.message) ||
      "serverContent" in log.message),
  transcription: (log: StreamingLog) =>
    typeof log.message === "string" && log.type === "transcription",
  none: () => true,
};

const component = (log: StreamingLog) => {
  if (typeof log.message === "string") {
    return PlainTextMessage;
  }
  if ("turns" in log.message && "turnComplete" in log.message) {
    return ClientContentLog;
  }
  if ("toolCall" in log.message) {
    return ToolCallLog;
  }
  if ("toolCallCancellation" in log.message) {
    return ToolCallCancellationLog;
  }
  if ("functionResponses" in log.message) {
    return ToolResponseLog;
  }
  if ("serverContent" in log.message) {
    const { serverContent } = log.message;
    if (serverContent?.interrupted) {
      return CustomPlainTextLog("interrupted");
    }
    if (serverContent?.turnComplete) {
      return CustomPlainTextLog("turnComplete");
    }
    if (serverContent && "modelTurn" in serverContent) {
      return ModelTurnLog;
    }
  }
  return AnyMessage;
};

export default function Logger({ filter = "transcription" }: LoggerProps) {
  const { logs } = useLoggerStore();

  const filterFn = filters[filter];

  return (
    <LoggerContainer>
      <LoggerList>
        {logs.filter(filterFn).map((log: StreamingLog, key: number) => {
          return (
            <LogEntry MessageComponent={component(log)} log={log} key={key} />
          );
        })}
      </LoggerList>
    </LoggerContainer>
  );
}
