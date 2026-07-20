import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ConfigProvider } from "antd"
import App from "./App.tsx"
import "antd/dist/reset.css"
import "@fontsource-variable/inter/index.css"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#2563eb",
          borderRadius: 8,
          fontSize: 14,
          colorBgContainer: "#ffffff",
          colorBorder: "#d5dbe7",
          colorBorderSecondary: "#e3e7ef",
          colorText: "#111827",
          colorTextSecondary: "#6b7280",
          colorBgLayout: "#f5f7fa",
          boxShadow:
            "0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)",
          boxShadowSecondary:
            "0 12px 32px rgba(16, 24, 40, 0.12), 0 4px 8px rgba(16, 24, 40, 0.04)",
        },
        components: {
          Table: {
            headerBg: "#f8fafc",
            headerColor: "#6b7280",
            headerSplitColor: "#e3e7ef",
            rowHoverBg: "rgba(37, 99, 235, 0.04)",
            rowSelectedBg: "rgba(37, 99, 235, 0.08)",
            borderColor: "#eef1f6",
          },
          Modal: {
            borderRadiusLG: 12,
            boxShadow:
              "0 12px 32px rgba(16, 24, 40, 0.12), 0 4px 8px rgba(16, 24, 40, 0.04)",
          },
          Select: {
            optionSelectedBg: "#dbeafe",
            optionActiveBg: "rgba(37, 99, 235, 0.08)",
          },
          Button: {
            borderRadius: 8,
            fontWeight: 500,
          },
          Input: {
            borderRadius: 8,
          },
          Tag: {
            borderRadiusSM: 999,
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>
)
