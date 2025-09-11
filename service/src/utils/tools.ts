import {Type, FunctionDeclaration } from "@google/genai";
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Validates if a tool has the required properties
 */
const isValidTool = (tool: any): boolean => {
  return !!(tool.name && tool.description && tool.schema);
};

/**
 * Converts a JSON Schema property to GoogleGenAI format
 */
const convertSchemaProperty = (schema: any): any => {
  const property: any = getBaseProperty(schema);
  addOptionalProperties(property, schema);
  return property;
};

/**
 * Gets the base property type for a schema
 */
const getBaseProperty = (schema: any): any => {
  switch (schema.type) {
    case 'string':
      return { type: Type.STRING };
    case 'integer':
    case 'number':
      return { type: Type.NUMBER };
    case 'boolean':
      return { type: Type.BOOLEAN };
    case 'array':
      return {
        type: Type.ARRAY,
        items: schema.items ? convertSchemaProperty(schema.items) : { type: Type.STRING },
      };
    case 'object':
      return buildObjectProperty(schema);
    default:
      return { type: Type.STRING };
  }
};

/**
 * Builds an object property with its nested properties
 */
const buildObjectProperty = (schema: any): any => {
  if (!schema.properties) {
    return { type: Type.OBJECT };
  }

  const properties: any = {};
  for (const [key, value] of Object.entries(schema.properties)) {
    properties[key] = convertSchemaProperty(value);
  }

  const property: any = { type: Type.OBJECT, properties };
  if (schema.required && Array.isArray(schema.required)) {
    property.required = schema.required;
  }
  return property;
};

/**
 * Adds optional properties like description, enum, min/max to a property
 */
const addOptionalProperties = (property: any, schema: any): void => {
  if (schema.description) {
    property.description = schema.description;
  }
  if (schema.enum) {
    property.enum = schema.enum;
  }
  if (schema.minimum !== undefined) {
    property.minimum = schema.minimum;
  }
  if (schema.maximum !== undefined) {
    property.maximum = schema.maximum;
  }
};

/**
 * Builds parameter schema from JSON schema
 */
const buildParametersSchema = (jsonSchema: any): any => {
  const schemaAsAny = jsonSchema as any;
  
  if (schemaAsAny.type === 'object' && schemaAsAny.properties) {
    return buildObjectParametersSchema(schemaAsAny);
  }
  
  return buildWrappedParametersSchema(jsonSchema);
};

/**
 * Builds parameters schema for object type schemas
 */
const buildObjectParametersSchema = (schema: any): any => {
  const parametersSchema: any = {
    type: Type.OBJECT,
    properties: {},
  };

  for (const [key, value] of Object.entries(schema.properties)) {
    parametersSchema.properties[key] = convertSchemaProperty(value);
  }

  if (schema.required && Array.isArray(schema.required)) {
    parametersSchema.required = schema.required;
  }

  return parametersSchema;
};

/**
 * Wraps non-object schemas as a single input parameter
 */
const buildWrappedParametersSchema = (jsonSchema: any): any => {
  return {
    type: Type.OBJECT,
    properties: {
      input: convertSchemaProperty(jsonSchema),
    },
  };
};

/**
 * Converts a single tool to FunctionDeclaration format
 */
const convertToolToFunctionDeclaration = (tool: any): FunctionDeclaration | null => {
  if (!isValidTool(tool)) {
    return null;
  }

  try {
    const jsonSchema = zodToJsonSchema(tool.schema);
    const parametersSchema = buildParametersSchema(jsonSchema);

    return {
      name: tool.name,
      description: tool.description,
      parameters: parametersSchema,
    };
  } catch (error) {
    console.error('Error converting tool schema:', error);
    return null;
  }
};

/**
 * Converts tools to executable format for GoogleGenAI
 */
export const getExecutableTools = (tools: Record<string, any>): FunctionDeclaration[] => {
  const toolsArray = Array.isArray(tools) ? tools : Object.values(tools);
  
  const convertedTools = toolsArray
    .map(convertToolToFunctionDeclaration)
    .filter((tool): tool is FunctionDeclaration => tool !== null);

  return convertedTools;
};