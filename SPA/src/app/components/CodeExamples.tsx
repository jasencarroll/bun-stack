import React from "react";

const examples = [
  {
    title: "API Endpoint",
    code: `// src/server/routes/users.ts
export const users = {
  "/:id": {
    GET: async (req: Request & { params: { id: string } }) => {
      const user = await db.users.findById(req.params.id);
      return Response.json(user);
    }
  }
};`,
  },
  {
    title: "React Component",
    code: `// src/app/components/UserProfile.tsx
function UserProfile({ id }: { id: string }) {
  const { data: user } = useQuery({
    queryKey: ['user', id],
    queryFn: () => fetch(\`/api/users/\${id}\`).then(r => r.json())
  });
  
  return <div>Welcome, {user?.name}!</div>;
}`,
  },
  {
    title: "Authentication",
    code: `// Register a new user
const { token, user } = await auth.register({
  email: "user@example.com",
  password: "secure123"
});

// Protected routes just work
const protectedRoute = withAuth(async (req, user) => {
  return Response.json({ message: \`Hello \${user.name}!\` });
});`,
  },
  {
    title: "Testing",
    code: `// Real integration tests, no mocks needed
test("creates a user", async () => {
  const response = await fetch("http://localhost:3000/api/users", {
    method: "POST",
    body: JSON.stringify({ name: "Test User" })
  });
  
  expect(response.status).toBe(201);
});`,
  },
];

export function CodeExamples() {
  const [activeTab, setActiveTab] = React.useState(0);

  return (
    <section id="examples" className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Write <span className="gradient-text">beautiful</span> code
          </h2>
          <p className="text-xl text-gray-300">Clean, intuitive APIs that just make sense</p>
        </div>

        <div className="glass-effect rounded-xl overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-700">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`px-6 py-3 whitespace-nowrap transition-colors ${
                  activeTab === index
                    ? "bg-bun-accent text-bun-dark font-semibold"
                    : "hover:bg-white/10"
                }`}
              >
                {example.title}
              </button>
            ))}
          </div>

          <div className="p-6">
            <pre className="code-block text-gray-300 overflow-x-auto">
              <code>{examples[activeTab].code}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
