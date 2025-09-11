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
import { FrontendTool } from "./frontend-types";

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

export function useLiveAPI(baseUrl: string, frontEndTools?: FrontendTool[]): UseLiveAPIResults {
  const [token, setToken] = useState<string | null>(null);
  const sdkToolsResult = useSWR(
    "ai-agent/getSDKTools",
    () => getSDKTools(baseUrl),
    revalidateOptions
  );

  const aiAgentPropertiesResult = useSWR(
    "ai-agent/getAIAgentProperties",
    () => getAIAgentProperties(baseUrl),
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
          parts: [{ text: `You are AI shopping assistant implemented by commercetools and running in the ecommerce website.
    Your goal is to help the user find the best products for their needs and support them in their shopping experience.
    Only present products that are retrieved from the commercetools catalog using the tools provided. Fake products are not allowed.
    Don't give long answers, just the answer. Keep your answers concise and to the point. For example, when detailing a product, don't read the whole description, just the most relevant information.
    Don't act too much like a salesman and Don't be over the limit nice.
    If you don't know the answer, just say you don't know.
    Do not refere me to the website, just answer the question or say you don't know.
    Do not use the name of the product once is clear that we are talking about it.
    IMPORTANT: Do not retry a function call until the user confirms.

    IMPORTANT TOOLS GUIDELINES:
    - When searching for products and using search_products tool, the tool will return a list of products. You can use the product masterVariant's SKU to get the product details.
    - When using search_products always send productProjectionParameters parameter with and empty object aka {}.
    - When searching products by category, first READ ALL categories (NO WHERE CLAUSE) and then use the category keys to search for products (search_products tool using categoriesSubTree).
    - search_products tool's query parameter is documented at https://docs.commercetools.com/api/search-query-language#searchquery
    - The prices field is "variants.prices.centAmount"    
    - For category searches, use: categoriesSubTree:"category_id" (NOT categories.id=)
    - Never use dots in field names like categories.id - use categoriesSubTree instead
    - For key-based searches, use: key in ("key1","key2") syntax
    - When using where parameter, always use quotes around values: "value"
    - Example valid where clauses:
      * text.en-US:"levis jeans"
      * categoriesSubTree:"category_id"
      * key in ("product1","product2")
    - When updating the cart, use the current cart version

    You will have tools, use them. Think of your main actions as PLP, PDP, Add to Cart, Checkout, etc.
    ` }],
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

  const _callSDKTool = (toolName: string, toolArguments: any) => callSDKTool(baseUrl, toolName, toolArguments);
  const _getGeminiEphemeralToken = () => getGeminiEphemeralToken(baseUrl);

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
