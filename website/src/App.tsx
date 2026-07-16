import React from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import "./App.css";

import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import Sync from "./pages/Sync";
import SyncSpike from "./pages/SyncSpike";
import { VideosProvider } from "./lib/videos";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-container">
      <header className="header" style={{ borderRadius: "var(--radius-sm)", marginBottom: "var(--spacing-md)" }}>
        <Link to="/" className="logo">
          <span>💃</span> Motion Replay Lab
        </Link>
        <Link to="/sync-spike" className="nav-link">
          Sync Spike
        </Link>
        <Link to="/sync" className="nav-link">
          Sync
        </Link>

      </header>
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <VideosProvider>
      <HashRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Layout>
                <Dashboard />
              </Layout>
            }
          />
          <Route
            path="/practice/:id"
            element={
              <Layout>
                <Practice />
              </Layout>
            }
          />
          <Route
            path="/sync"
            element={
              <Layout>
                <Sync />
              </Layout>
            }
          />
          <Route
            path="/sync-spike"
            element={
              <Layout>
                <SyncSpike />
              </Layout>
            }
          />
        </Routes>
      </HashRouter>
    </VideosProvider>
  );
}
