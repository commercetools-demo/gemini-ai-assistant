import { FunctionDeclaration } from "@google/genai";

export interface FrontendTool extends FunctionDeclaration {
  callTool: (args: any) => any;
}

export interface MCPContext {
  customerId?: string;
  cartId?: string;
  storeKey?: string;
  businessUnitKey?: string;
}