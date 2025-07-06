import React from "react";
import {
  BoltIcon,
  ShieldCheckIcon,
  CircleStackIcon,
  CubeIcon,
  BeakerIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const features = [
  {
    icon: BoltIcon,
    title: "10x Faster Setup",
    description: "Powered by Bun's lightning-fast runtime. Install dependencies 10x faster than npm. Start your server in <10ms.",
  },
  {
    icon: CubeIcon,
    title: "Full-Stack Execution",
    description: "Frontend to infrastructure - everything configured. Reduces project setup from hours to seconds, enforcing best practices across teams.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Enterprise-Ready Security",
    description: "CSRF protection, secure headers, and JWT auth built-in. Meet compliance requirements without the configuration overhead.",
  },
  {
    icon: CircleStackIcon,
    title: "Flexible Architecture",
    description: "PostgreSQL for production, SQLite for development. Easily extensible for GraphQL, WebSockets, or custom solutions.",
  },
  {
    icon: BeakerIcon,
    title: "Quality Assurance",
    description: "Integration tests that actually work. Reduce QA cycles and improve team confidence with pre-configured testing.",
  },
  {
    icon: SparklesIcon,
    title: "Developer Productivity",
    description: "Hot reload, TypeScript, and modern tooling. Onboard new team members in minutes, not days.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything you need, <span className="gradient-text">nothing you don't</span>
          </h2>
          <p className="text-xl text-gray-300">Stop configuring. Start building.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="glass-effect rounded-xl p-8 hover:bg-white/10 transition-all duration-300 hover:scale-105"
              >
                <Icon className="h-12 w-12 text-bun-accent mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
