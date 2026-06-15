// main.jsx — entry point
// React needs one JavaScript file that "mounts" the app into the HTML page.
// This finds the <div id="root"> in index.html and renders <App /> inside it.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
