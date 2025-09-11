import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { Route, BrowserRouter as Router } from "react-router-dom";
import { LiveAPIProvider } from "@commercetools-demo/ai-assistant-provider";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <LiveAPIProvider
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
    >
      <App />
    </LiveAPIProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
