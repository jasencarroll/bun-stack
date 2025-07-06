import React from "react";
import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { DocsLayout } from "./components/docs/DocsLayout";
import { DocsPage } from "./pages/DocsPage";
import { DocViewerPage } from "./pages/DocViewerPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/docs" element={<DocsLayout />}>
        <Route index element={<DocsPage />} />
        <Route path=":category" element={<DocViewerPage />} />
        <Route path=":category/:slug" element={<DocViewerPage />} />
      </Route>
    </Routes>
  );
}
