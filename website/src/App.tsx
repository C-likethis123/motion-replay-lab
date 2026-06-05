import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./App.css";

import Dashboard from "./pages/Dashboard";
import VideoDetail from "./pages/VideoDetail";
import Practice from "./pages/Practice";
import { VideosProvider } from "./lib/videos";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-container">
      <header className="header" style={{ borderRadius: "var(--radius-sm)", marginBottom: "var(--spacing-md)" }}>
        <Link to="/" className="logo">
          <span>💃</span> Motion Replay Lab
        </Link>
        <nav style={{ display: "flex", gap: "var(--spacing-md)" }}>
          <Link to="/" className="nav-link">
            Library
          </Link>
        </nav>
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
      <BrowserRouter>
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
            path="/video/:id"
            element={
              <Layout>
                <VideoDetail />
              </Layout>
            }
          />
          <Route
            path="/practice/:id"
            element={
              // Practice mode has a full-screen, custom black video chrome, so we don't wrap it with the standard Layout.
              <Practice />
            }
          />
        </Routes>
      </BrowserRouter>
    </VideosProvider>
  );
}
