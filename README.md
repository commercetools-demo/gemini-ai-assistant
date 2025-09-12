<p align="center">
  <a href="https://commercetools.com/">
    <img alt="commercetools logo" src="https://unpkg.com/@commercetools-frontend/assets/logos/commercetools_primary-logo_horizontal_RGB.png">
  </a></br>
  <b>AI Assistant for commercetools</b>
</p>

<b>Note: This project is NOT official commercetools project. Use it at your own risk.</b>

An AI-powered assistant for commercetools that enables natural language interactions with your commerce platform using Google's Gemini AI. This project includes both a deployable connect service and React components for frontend integration.

## Project Structure

This repository contains two main components:

### 🚀 Connect Service (`/service`)
A commercetools connect service that provides AI assistant capabilities through Gemini AI integration. The service enables natural language interactions with commercetools APIs for product search, cart management, and category navigation.

### 📦 React Components (`/shared`)
NPM packages published to provide React components for frontend integration:
- `@commercetools-demo/gemini-ai-assistant-provider` - Context provider for AI assistant functionality
- `@commercetools-demo/gemini-ai-assistant-button` - UI component for the AI assistant interface

## Deployment

### Connect Service Deployment

Deploy the service as a commercetools connect application. For detailed deployment instructions, refer to the [commercetools Connect documentation](https://docs.commercetools.com/connect/).

### Environment Variables

The following environment variables are required for deployment:

#### Standard Configuration
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `CTP_REGION` | commercetools Composable Commerce API region | Yes | `us-central1.gcp` |
| `CTP_PROJECT_KEY` | commercetools Composable Commerce project key | Yes | - |
| `CTP_CLIENT_ID` | commercetools Composable Commerce client ID | Yes | - |
| `CTP_SCOPE` | commercetools Composable Commerce client scope | Yes | - |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins | No | `localhost:3000,localhost:5173,commercetools.com,frontend.site` |
| `AI_MODEL` | AI model to use | Yes | `models/gemini-live-2.5-flash-preview` |
| `AI_VOICE` | AI voice to use | Yes | `Aoede` |
| `AVAILABLE_TOOLS` | Available tools configuration (JSON string) | No | `{"product-search":{"read":true},"category":{"read":true},"cart":{"create":true,"read":true,"update":true}}` |
| `FRONTEND_TOOLS` | Array of extra tools which can be injected in the frontend. (JSON string) https://googleapis.github.io/js-genai/release_docs/interfaces/types.FunctionDeclaration.html | No | `[{"name": "tool1","description": "tool1-description","parameters": {"type": "object","properties": {}}}]` |

#### Secured Configuration
| Variable | Description | Required |
|----------|-------------|----------|
| `CTP_CLIENT_SECRET` | commercetools Composable Commerce client secret | Yes |
| `GOOGLE_AI_API_KEY` | Google Gemini API key | Yes |

### Prerequisites

1. **commercetools Project**: Active commercetools project with appropriate API credentials
2. **Google AI API Key**: Valid Google Gemini API key for AI functionality
3. **Connect Deployment**: Access to commercetools Connect for service deployment

## React Components Usage

After deploying the connect service, integrate the AI assistant into your React application:

### Installation

```bash
npm install @commercetools-demo/gemini-ai-assistant-provider @commercetools-demo/gemini-ai-assistant-button
```

### Basic Usage

```tsx
import { GeminiAIAssistantProvider } from '@commercetools-demo/gemini-ai-assistant-provider';
import { GeminiAIAssistantButton } from '@commercetools-demo/gemini-ai-assistant-button';

function App() {
  return (
    <GeminiAIAssistantProvider 
      serviceEndpoint="https://your-deployed-service-endpoint.com/service"
      projectKey="your-project-key"
    >
      <div className="your-app">
        {/* Your app content */}
        <GeminiAIAssistantButton />
      </div>
    </GeminiAIAssistantProvider>
  );
}
```

## Development

### Service Development
```bash
cd service
yarn install
yarn start:dev
```

### React Components Development
```bash
cd shared
yarn install
yarn build
yarn start  # Runs test application
```

## Features

- 🤖 **Natural Language Processing**: Interact with your commerce platform using natural language
- 🛍️ **Product Search**: AI-powered product discovery and search
- 🛒 **Cart Management**: Create, read, and update shopping carts through conversation
- 📊 **Category Navigation**: Browse and explore product categories intuitively
- 🎙️ **Voice Interaction**: Support for voice-based interactions with Gemini Live API
- ⚡ **Real-time Streaming**: Live streaming responses for enhanced user experience

## Architecture

The AI assistant follows commercetools connect architecture principles:
- Lightweight and scalable service design
- Secure environment-based configuration
- Point-to-point integration with commercetools APIs
- Modern React component architecture for frontend integration

## License

MIT License - see individual package.json files for specific licensing information.
