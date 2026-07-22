import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom"
import { Sidebar } from "@/components/Sidebar"
import { TopBar } from "@/components/TopBar"
import { Breadcrumb } from "@/components/Breadcrumb"
import { Dashboard } from "@/views/dashboard"
import { McpServers } from "@/views/mcp-servers"
import { GatewayTools } from "@/views/gateway-tools"
import { GatewayTest } from "@/views/gateway-test"

function AppLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Animated background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-orb-a absolute -left-40 -top-40 size-[520px] rounded-full bg-blue-400/30 blur-[100px]" />
        <div className="animate-orb-b absolute -right-40 top-1/4 size-[480px] rounded-full bg-violet-400/25 blur-[100px]" />
        <div className="animate-orb-c absolute -bottom-40 left-1/3 size-[460px] rounded-full bg-cyan-300/20 blur-[100px]" />
        <div className="animate-orb-d absolute bottom-1/4 right-1/4 size-96 rounded-full bg-rose-300/15 blur-[100px]" />
      </div>

      <Sidebar />
      <main
        className="relative flex flex-col overflow-hidden"
        style={{
          marginLeft: "var(--sidebar-width)",
          width: "calc(100vw - var(--sidebar-width))",
        }}
      >
        <TopBar />
        <Breadcrumb />
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/mcp-servers" element={<McpServers />} />
          <Route path="/gateway-tools" element={<GatewayTools />} />
          <Route
            path="/protocol-config"
            element={<Navigate to="/mcp-servers" replace />}
          />
          <Route path="/gateway-test" element={<GatewayTest />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
