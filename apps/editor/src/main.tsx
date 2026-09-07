import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@xyflow/react/dist/style.css";
import { App } from "./App.tsx";
import { registerOffline } from "./offline/register.ts";
import { readStudioConfig } from "./persist/studio.ts";
import "./styles/app.css";

if (!readStudioConfig()) registerOffline();

const root = document.getElementById("root");
if (!root) throw new Error("root element missing");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
