import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router";

import "i18n/config";
import "styles/index.css";

import { AuthProvider } from "app/auth";
import router from "app/router";

// Dark mode follows the device setting live (index.html sets it before the first paint).
const dark = window.matchMedia("(prefers-color-scheme: dark)");
dark.addEventListener("change", (e) => document.documentElement.classList.toggle("dark", e.matches));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);
