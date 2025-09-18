import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GenAILiveClient } from "../utils/genai-live-client";
import { AudioStreamer } from "../utils/audio-streamer";
import { audioContext } from "../utils";
import VolMeterWorket from "../utils/vol-meter";
import { FunctionDeclaration, LiveConnectConfig, Tool } from "@google/genai";
import useSWR from "swr";
import {
  callSDKTool,
  getAIAgentProperties,
  getGeminiEphemeralToken,
  getSDKTools,
  healthCheck,
} from "./api-calls";
import { FrontendTool, MCPContext } from "./frontend-types";
import { SYSTEM_INSTRUCTION } from "../constants";

export type GeminiEphemeralToken = {
  apiKey: string;
  clientSecret: string;
  name: string;
};

export type UseLiveAPIResults = {
  baseUrl: string;
  sdkTools?: FunctionDeclaration[];
  client: GenAILiveClient | null;
  config: LiveConnectConfig;
  model: string;
  connected: boolean;
  callSDKTool: (
    toolName: string,
    toolArguments: any
  ) => Promise<Record<string, any>>;
  callFrontendTool: (toolName?: string, toolArguments?: any) => any;
  getGeminiEphemeralToken: () => Promise<string>;
  healthCheck: () => Promise<any>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
};

const revalidateOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  revalidateIfStale: false,
};

export function useLiveAPI(baseUrl: string, frontEndTools?: FrontendTool[], systemInstruction?: string, context?: MCPContext): UseLiveAPIResults {
  const [token, setToken] = useState<string | null>(null);
  const sdkToolsResult = useSWR(
    "ai-agent/getSDKTools",
    () => getSDKTools(baseUrl, context),
    revalidateOptions
  );

  const aiAgentPropertiesResult = useSWR(
    "ai-agent/getAIAgentProperties",
    () => getAIAgentProperties(baseUrl, context),
    revalidateOptions
  );

  const client = useMemo(() => {
    if (token) {
      return new GenAILiveClient({
        apiKey: token,
        apiVersion: "v1alpha",
      });
    }
    return null;
  }, [token]);

  const config: LiveConnectConfig = useMemo(() => {
    if (sdkToolsResult.data && aiAgentPropertiesResult.data) {
      const _frontEndTools = (frontEndTools || []).map(({ callTool, ...tool }) => tool);
      return {
        tools: [{ functionDeclarations: [...sdkToolsResult.data, ..._frontEndTools] }] as Tool[],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: aiAgentPropertiesResult.data?.voice,
            },
          },
        },
        systemInstruction: {
          parts: [{ text: systemInstruction || SYSTEM_INSTRUCTION }],
        },
      };
    }
    return {
      tools: [{ functionDeclarations: [] }],
    };
  }, [sdkToolsResult.data, aiAgentPropertiesResult.data]);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);

  const connect = useCallback(async () => {
    if (!config || !client) {
      throw new Error("config has not been set");
    }
    client.disconnect();
    if (!aiAgentPropertiesResult.data?.model) {
      throw new Error("Model has not been set");
    }
    await client.connect(aiAgentPropertiesResult.data?.model, config);
  }, [client, config, aiAgentPropertiesResult.data?.model]);

  const disconnect = useCallback(async () => {
    if (!client) {
      return;
    }
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  const onReconnect = useCallback(
    async (e: CloseEvent) => {
      console.log("onReconnect", e);
      if (
        e.reason === "Token has been used too many times" ||
        e.reason === "new_session_expire_time deadline exceeded"
      ) {
        // TODO: Revalidate token
      } else {
        setConnected(false);
      }
    },
    [connect]
  );

  const _callSDKTool = (toolName: string, toolArguments: any) => callSDKTool(baseUrl, toolName, toolArguments, context);
  const _getGeminiEphemeralToken = () => getGeminiEphemeralToken(baseUrl, context);

  const callFrontendTool = (toolName?: string, toolArguments?: any) : any => {
    if (!toolName) {
      return null;
    }
    const frontendTool = frontEndTools?.find((tool) => tool.name === toolName);
    if (!frontendTool) {
      return null;
    }
    const result = frontendTool.callTool(toolArguments);
    return result;
  };

  const health = useCallback(async () => {
    const result = await healthCheck(baseUrl);
    return result;
  }, [baseUrl]);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    if (!client) {
      return;
    }
    const onOpen = () => {
      setConnected(true);
    };

    const onError = (error: ErrorEvent) => {
      console.error("error", error);
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));


    client
      .on("error", onError)
      .on("open", onOpen)
      .on("close", onReconnect)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio);

    return () => {
      client
        .off("error", onError)
        .off("open", onOpen)
        .off("close", onReconnect)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .disconnect();
    };
  }, [client]);

  useEffect(() => {
      getGeminiEphemeralToken(baseUrl).then((res) => {
        setToken(res.token);
      });
  }, []);

  return {
    baseUrl,
    sdkTools: sdkToolsResult.data,
    client,
    config,
    model: aiAgentPropertiesResult.data?.model || "",
    connected,
    volume,
    callSDKTool: _callSDKTool,
    callFrontendTool,
    getGeminiEphemeralToken: _getGeminiEphemeralToken,
    healthCheck: health,
    connect,
    disconnect,
  };
}
