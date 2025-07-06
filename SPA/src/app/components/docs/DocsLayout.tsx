import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { DocsSidebar } from "./DocsSidebar";
import { DocsSearch } from "./DocsSearch";
import { DocsBreadcrumb } from "./DocsBreadcrumb";
import { Navigation } from "../Navigation";
import { Footer } from "../Footer";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

export interface DocTreeItem {
  name: string;
  path: string;
  meta: {
    title: string;
    description?: string;
    order?: number;
    category?: string;
    slug?: string;
  };
  children?: DocTreeItem[];
}

export function DocsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [docsTree, setDocsTree] = useState<DocTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Close sidebar on route change (mobile)
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    // Fetch documentation tree
    fetch("/api/docs")
      .then((res) => res.json())
      .then((data) => {
        setDocsTree(data.tree || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load docs tree:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-bun-dark text-bun-light">
      <Navigation />
      
      <div className="pt-16 flex">
        {/* Mobile sidebar toggle */}
        <div className="fixed top-20 left-4 z-40 lg:hidden">
          <button
            type="button"
            className="p-2 rounded-md bg-bun-dark/50 backdrop-blur-lg border border-white/10 text-bun-light hover:text-bun-accent"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Mobile sidebar */}
        <div className={`relative z-50 lg:hidden ${sidebarOpen ? "" : "hidden"}`}>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button
                  type="button"
                  className="-m-2.5 p-2.5 text-white hover:text-bun-accent"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-bun-dark/95 backdrop-blur-lg px-6 pb-4 border-r border-white/10">
                <div className="flex h-16 shrink-0 items-center pt-4">
                  <DocsSearch />
                </div>
                <nav className="flex flex-1 flex-col">
                  <DocsSidebar tree={docsTree} />
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-72 lg:flex-col lg:pt-16">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-bun-dark/50 backdrop-blur-lg border-r border-white/10 px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <DocsSearch />
            </div>
            <nav className="flex flex-1 flex-col docs-sidebar">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-800 rounded mb-4"></div>
                  <div className="h-8 bg-gray-800 rounded mb-4"></div>
                  <div className="h-8 bg-gray-800 rounded mb-4"></div>
                </div>
              ) : (
                <DocsSidebar tree={docsTree} />
              )}
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 lg:pl-72">
          <main className="py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <DocsBreadcrumb />
              <Outlet />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}