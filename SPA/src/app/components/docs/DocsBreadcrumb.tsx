import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/20/solid";

export function DocsBreadcrumb() {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  // Skip if we're at the docs root
  if (pathSegments.length <= 1) {
    return null;
  }

  const breadcrumbs = pathSegments.slice(1).map((segment, index) => {
    const path = "/" + pathSegments.slice(0, index + 2).join("/");
    const name = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return {
      name,
      path,
      current: index === pathSegments.length - 2,
    };
  });

  return (
    <nav className="flex mb-8" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-4">
        <li>
          <div>
            <Link to="/docs" className="text-bun-light/40 hover:text-bun-accent transition-colors">
              <HomeIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span className="sr-only">Docs Home</span>
            </Link>
          </div>
        </li>
        {breadcrumbs.map((item) => (
          <li key={item.path}>
            <div className="flex items-center">
              <ChevronRightIcon
                className="h-5 w-5 flex-shrink-0 text-bun-light/40"
                aria-hidden="true"
              />
              {item.current ? (
                <span className="ml-4 text-sm font-medium text-bun-light/70">{item.name}</span>
              ) : (
                <Link
                  to={item.path}
                  className="ml-4 text-sm font-medium text-bun-light/70 hover:text-bun-accent transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}