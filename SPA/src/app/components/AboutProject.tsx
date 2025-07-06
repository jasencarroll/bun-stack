import React from "react";
import { 
  LightBulbIcon, 
  ChartBarIcon, 
  CodeBracketIcon,
  BriefcaseIcon,
  UserGroupIcon,
  RocketLaunchIcon 
} from "@heroicons/react/24/outline";

export function AboutProject() {
  return (
    <section id="about" className="py-20 px-4 bg-gradient-to-b from-transparent to-bun-dark/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Strategic Vision Meets <span className="gradient-text">Technical Excellence</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Bun Stack bridges the gap between rapid prototyping and production-grade applications
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div className="glass-effect rounded-xl p-8">
            <h3 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <LightBulbIcon className="h-8 w-8 text-bun-accent" />
              The Problem We Solved
            </h3>
            <p className="text-gray-300 mb-4">
              JavaScript developers faced a critical gap: Rails offered unmatched productivity through 
              convention over configuration, but the modern JS ecosystem lacked a comparable solution. 
              Teams were spending hours on boilerplate setup instead of building features.
            </p>
            <p className="text-gray-300">
              By identifying this market need and leveraging Bun's performance advantages, we created 
              a framework that delivers Rails-like productivity with modern JavaScript capabilities.
            </p>
          </div>

          <div className="glass-effect rounded-xl p-8">
            <h3 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <ChartBarIcon className="h-8 w-8 text-bun-accent" />
              Measurable Impact
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="text-bun-accent text-2xl font-bold">10x</div>
                <div>
                  <p className="font-semibold">Faster Dependency Installation</p>
                  <p className="text-gray-400 text-sm">Bun vs traditional npm/yarn</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-bun-accent text-2xl font-bold">95%</div>
                <div>
                  <p className="font-semibold">Reduction in Setup Time</p>
                  <p className="text-gray-400 text-sm">30 seconds vs 30+ minutes</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-bun-accent text-2xl font-bold">100%</div>
                <div>
                  <p className="font-semibold">Best Practices Adoption</p>
                  <p className="text-gray-400 text-sm">Security, testing, and tooling configured</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 mb-12">
          <h3 className="text-2xl font-semibold mb-6 text-center">Who Benefits from Bun Stack</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <RocketLaunchIcon className="h-12 w-12 text-bun-accent mx-auto mb-3" />
              <h4 className="font-semibold mb-2">Startups & MVPs</h4>
              <p className="text-gray-400 text-sm">
                Launch faster with production-ready infrastructure from day one
              </p>
            </div>
            <div className="text-center">
              <UserGroupIcon className="h-12 w-12 text-bun-accent mx-auto mb-3" />
              <h4 className="font-semibold mb-2">Engineering Teams</h4>
              <p className="text-gray-400 text-sm">
                Standardize practices and onboard developers in minutes
              </p>
            </div>
            <div className="text-center">
              <BriefcaseIcon className="h-12 w-12 text-bun-accent mx-auto mb-3" />
              <h4 className="font-semibold mb-2">Consultants</h4>
              <p className="text-gray-400 text-sm">
                Deliver client projects faster with battle-tested foundations
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-3 text-gray-400 mb-6">
            <CodeBracketIcon className="h-5 w-5" />
            <span>Created by Jasen Carroll</span>
            <span className="text-gray-600">•</span>
            <span>Full-Stack Engineer</span>
            <span className="text-gray-600">•</span>
            <span>MBA</span>
            <span className="text-gray-600">•</span>
            <span>AI Background</span>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Combining technical expertise with business acumen and AI insights to build tools that 
            accelerate software development for teams and startups.
          </p>
        </div>
      </div>
    </section>
  );
}