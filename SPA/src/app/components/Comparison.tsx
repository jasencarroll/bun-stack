import React from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";

const comparisons = [
  {
    feature: "Fullstack",
    bunStack: true,
    cra: false,
    nextjs: true,
    vite: false,
  },
  {
    feature: "Database",
    bunStack: true,
    cra: false,
    nextjs: false,
    vite: false,
  },
  {
    feature: "Authentication",
    bunStack: true,
    cra: false,
    nextjs: false,
    vite: false,
  },
  {
    feature: "Type Safety",
    bunStack: true,
    cra: "partial",
    nextjs: true,
    vite: true,
  },
  {
    feature: "Testing",
    bunStack: true,
    cra: true,
    nextjs: true,
    vite: true,
  },
  {
    feature: "Setup Time",
    bunStack: "< 30s",
    cra: "2-3min",
    nextjs: "1-2min",
    vite: "< 1min",
  },
];

export function Comparison() {
  return (
    <section id="comparison" className="py-20 px-4 bg-black/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            How it <span className="gradient-text">compares</span>
          </h2>
          <p className="text-xl text-gray-300">
            See why Bun Stack is the best choice for modern web apps
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-4 px-4">Feature</th>
                <th className="text-center py-4 px-4 text-bun-accent">Bun Stack</th>
                <th className="text-center py-4 px-4">CRA</th>
                <th className="text-center py-4 px-4">Next.js</th>
                <th className="text-center py-4 px-4">Vite</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row, index) => (
                <tr key={index} className="border-b border-gray-800">
                  <td className="py-4 px-4 font-medium">{row.feature}</td>
                  <td className="text-center py-4 px-4">{renderCell(row.bunStack, true)}</td>
                  <td className="text-center py-4 px-4">{renderCell(row.cra)}</td>
                  <td className="text-center py-4 px-4">{renderCell(row.nextjs)}</td>
                  <td className="text-center py-4 px-4">{renderCell(row.vite)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function renderCell(value: boolean | string, highlight = false) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckIcon
        className={`h-5 w-5 mx-auto ${highlight ? "text-bun-accent" : "text-green-500"}`}
      />
    ) : (
      <XMarkIcon className="h-5 w-5 text-red-500 mx-auto" />
    );
  }

  if (value === "partial") {
    return <span className="text-yellow-500">⚠️</span>;
  }

  return <span className={highlight ? "text-bun-accent font-semibold" : ""}>{value}</span>;
}
