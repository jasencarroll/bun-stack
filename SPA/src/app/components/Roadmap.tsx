import React from "react";
import { 
  ArrowPathIcon,
  CircleStackIcon,
  CpuChipIcon,
  CubeTransparentIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  PuzzlePieceIcon,
  ServerStackIcon,
  WifiIcon
} from "@heroicons/react/24/outline";

const roadmapItems = [
  {
    icon: WifiIcon,
    title: "WebSocket Support",
    description: "Real-time features for chat, notifications, and live updates",
    status: "planned",
    impact: "Enable real-time collaborative applications"
  },
  {
    icon: CircleStackIcon,
    title: "GraphQL Integration",
    description: "Alternative to REST for flexible API queries",
    status: "planned",
    impact: "Reduce API calls by 50% for complex data needs"
  },
  {
    icon: ServerStackIcon,
    title: "Multi-Database Support",
    description: "MySQL, MongoDB, and Redis integration",
    status: "planned",
    impact: "Adapt to any infrastructure requirement"
  },
  {
    icon: CpuChipIcon,
    title: "AI-Assisted Development",
    description: "Smart code generation and optimization suggestions",
    status: "exploring",
    impact: "Further accelerate development with AI insights"
  },
  {
    icon: PuzzlePieceIcon,
    title: "Plugin Architecture",
    description: "Extensible system for custom integrations",
    status: "planned",
    impact: "Enable teams to build custom solutions"
  },
  {
    icon: CubeTransparentIcon,
    title: "Admin Panel Generator",
    description: "Auto-generated CRUD interfaces",
    status: "planned",
    impact: "Save weeks of admin interface development"
  },
  {
    icon: EnvelopeIcon,
    title: "Email Service",
    description: "Transactional email with templates",
    status: "planned",
    impact: "Complete solution for user communications"
  },
  {
    icon: ArrowPathIcon,
    title: "Background Jobs",
    description: "Queue system for async processing",
    status: "planned",
    impact: "Handle complex workflows efficiently"
  },
  {
    icon: DocumentTextIcon,
    title: "API Documentation",
    description: "OpenAPI/Swagger auto-generation",
    status: "planned",
    impact: "Improve API adoption and integration"
  }
];

export function Roadmap() {
  return (
    <section id="roadmap" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-bun-accent/10 to-purple-900/10 rounded-xl p-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Built for Tomorrow's <span className="gradient-text">Challenges</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-6">
            Bun Stack isn't just a framework—it's a foundation for innovation. Our architecture is 
            designed to adapt and scale with your needs, from startups to enterprise applications.
          </p>
          <h3 className="text-2xl font-semibold mb-4">
            Extensible by Design
          </h3>
          <p className="text-gray-300 max-w-2xl mx-auto mb-8">
            Whether you need GraphQL for complex queries, WebSockets for real-time features, or AI integration 
            for next-gen capabilities, Bun Stack provides the foundation to build upon.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://github.com/jasencarroll/create-bun-stack/issues"
              className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition-all"
            >
              <GlobeAltIcon className="h-5 w-5" />
              <span>Suggest a Feature</span>
            </a>
            <a
              href="https://github.com/jasencarroll/create-bun-stack"
              className="inline-flex items-center gap-2 bg-bun-accent/20 text-bun-accent px-4 py-2 rounded-lg hover:bg-bun-accent/30 transition-all"
            >
              <span>Contribute on GitHub</span>
              <span className="text-xs">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}