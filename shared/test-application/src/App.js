import logo from "./logo.svg";
import "./App.css";
import { GeminiAIAssistant } from "@commercetools-demo/gemini-ai-assistant-button";

function App() {
  return (
    <div className="App">
      <GeminiAIAssistant
        baseUrl="http://localhost:8080/service"
        frontEndTools={[
          {
            name: "navigate_to_page",
            description:
              "Navigate to a specific page. pages are: home, product (PDP), category (PLP), search, cart, checkout.\n    - Note: to view Items in cart you don't need to navigate to cart page. use other tools to view items in cart.",
            parameters: {
              type: "object",
              properties: {
                page: {
                  type: "string",
                  enum: [
                    "home",
                    "product",
                    "category",
                    "search",
                    "cart",
                    "checkout",
                  ],
                  description:
                    "The page to navigate to. It needs either sku or category slug or searchQuery to navigate to the page.",
                },
                sku: {
                  type: "string",
                  description: "The sku of the masterVarinat to navigate to",
                },
                categorySlug: {
                  type: "string",
                  description: "The slug of the category to navigate to",
                },
                searchQuery: {
                  type: "string",
                  description: "The search query to navigate to",
                },
              },
            },
            callTool: (args) => {
              console.log("navigate_to_page", args);
              return {
                success: true,
              };
            },
          },
        ]}
      ></GeminiAIAssistant>
    </div>
  );
}

export default App;
