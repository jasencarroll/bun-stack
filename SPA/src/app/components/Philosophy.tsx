// Bun Stack: open-sourced competence at scale
import React from "react";
import { LockOpenIcon } from "@heroicons/react/24/outline";

export function Philosophy() {
  return (
    <section id="philosophy" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
            <LockOpenIcon className="h-10 w-10 text-bun-accent" />
            <span>Open-Sourced <span className="gradient-text">Leverage</span></span>
          </h2>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Bun Stack is more than a fullstack starter — it's everything you'd build if you had the time.
          </p>
        </div>

        <div className="glass-effect rounded-xl p-8 mb-12">
          <div className="text-center mb-8">
            <p className="text-3xl font-bold">
              <span className="gradient-text animate-gradient">Just code.</span>{" "}
              <span className="text-white">Just ship.</span>
            </p>
          </div>

          <div className="grid gap-4 max-w-3xl mx-auto">
            <div className="flex items-start space-x-3">
              <span className="text-bun-accent text-xl">✓</span>
              <span className="text-gray-300">Security defaults (CSRF, JWT, password hashing)</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-bun-accent text-xl">✓</span>
              <span className="text-gray-300">End-to-end TypeScript</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-bun-accent text-xl">✓</span>
              <span className="text-gray-300">Auth, routing, DB, CI/CD</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-bun-accent text-xl">✓</span>
              <span className="text-gray-300">Docker + 1-click Railway deploy</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-bun-accent text-xl">✓</span>
              <span className="text-gray-300">Convention-driven structure</span>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-lg text-gray-400">
              No yak shaving. No config hell. No architecture debates.
            </p>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent w-32 mx-auto mb-12"></div>

        <div className="text-center space-y-6">
          <h3 className="text-2xl font-semibold">
            Built by <a href="https://jasenc.dev" className="gradient-text hover:opacity-80 transition-opacity" target="_blank" rel="noopener noreferrer">Jasen</a>
          </h3>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 max-w-2xl mx-auto space-y-4">
            <p className="text-gray-300">
              Engineer. Systems thinker. MBA. DX evangelist.
            </p>
            
            <blockquote className="border-l-4 border-bun-accent pl-4">
              <p className="text-gray-300 italic">
                I built Bun Stack to curate an open-source experience that gives everyone the leverage to ship production apps — instantly.
              </p>
            </blockquote>
            
            <p className="text-xl font-semibold text-white">
              Now it's yours. <span className="gradient-text">Just ship.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}