import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import type { DocTreeItem } from "./DocsLayout";

interface DocsSidebarProps {
  tree: DocTreeItem[];
}

export function DocsSidebar({ tree }: DocsSidebarProps) {
  const location = useLocation();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (path: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedCategories(newExpanded);
  };

  const isActive = (path: string) => {
    const docPath = `/docs/${path}`;
    return location.pathname === docPath || location.pathname.startsWith(`${docPath}/`);
  };

  const renderItem = (item: DocTreeItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedCategories.has(item.path) || isActive(item.path);
    const active = isActive(item.path);

    return (
      <li key={item.path}>
        {hasChildren ? (
          <>
            <div className="flex items-center">
              <Link
                to={`/docs/${item.path}`}
                className={`
                  flex-1 flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6
                  ${active ? "bg-white/10 text-bun-accent" : "text-bun-light/70 hover:bg-white/5 hover:text-bun-accent"}
                  transition-colors
                `}
              >
                {item.name}
              </Link>
              <button
                onClick={() => toggleCategory(item.path)}
                className={`
                  p-2 text-sm rounded-md
                  ${active ? "text-bun-accent" : "text-bun-light/70 hover:text-bun-accent"}
                  transition-colors
                `}
              >
                {isExpanded ? (
                  <ChevronDownIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                )}
              </button>
            </div>
            {isExpanded && (
              <ul className="mt-1 ml-3 space-y-1">
                {item.children.map((child) => renderItem(child, level + 1))}
              </ul>
            )}
          </>
        ) : (
          <Link
            to={`/docs/${item.path}`}
            className={`
              group flex gap-x-3 rounded-md p-2 text-sm leading-6
              ${level > 0 ? "pl-9" : ""}
              ${active 
                ? "bg-white/10 text-bun-accent font-semibold" 
                : "text-bun-light/70 hover:bg-white/5 hover:text-bun-accent"
              }
              transition-colors
            `}
          >
            {item.name}
          </Link>
        )}
      </li>
    );
  };

  return (
    <ul className="flex flex-1 flex-col gap-y-7">
      <li>
        <ul className="-mx-2 space-y-1">
          {tree.map((item) => renderItem(item))}
        </ul>
      </li>
    </ul>
  );
}