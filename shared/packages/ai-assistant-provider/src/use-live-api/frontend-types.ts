import { FunctionDeclaration } from "@google/genai";

export interface FrontendTool extends FunctionDeclaration {
  callTool: (args: any) => any;
}