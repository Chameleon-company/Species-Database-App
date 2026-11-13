import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import { Toaster } from "@sda/ui/components/sonner";
import "./index.css";
import App from "./app/App";
import { queryClient } from "./app/queryClient";
import { LanguageProvider } from "./LanguageContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <HashRouter>
          <App />
        </HashRouter>
        <Toaster position="bottom-center" richColors closeButton />
      </LanguageProvider>
    </QueryClientProvider>
  </StrictMode>
);
