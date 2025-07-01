import { serve } from "bun";
import { join } from "path";
import { Resend } from "resend";

const publicDir = join(import.meta.dir, "../../public");
const distDir = join(import.meta.dir, "../../dist");
const hmrFile = join(import.meta.dir, "../../.hmr-timestamp");

// Initialize Resend with API key from environment
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Simple router for our SPA
async function router(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // API routes (for future contact form)
  if (pathname.startsWith("/api/")) {
    if (pathname === "/api/hmr-check") {
      try {
        const timestamp = await Bun.file(hmrFile).text();
        return Response.json({ time: parseInt(timestamp) });
      } catch (e) {
        return Response.json({ time: Date.now() });
      }
    }

    if (pathname === "/api/contact" && req.method === "POST") {
      try {
        const data = await req.json();

        // Validate the data
        if (!data.name || !data.email || !data.message) {
          return Response.json({ error: "Name, email, and message are required" }, { status: 400 });
        }

        console.log("📧 New contact form submission:");
        console.log(`  Name: ${data.name}`);
        console.log(`  Email: ${data.email}`);
        console.log(`  Message: ${data.message}`);

        // Send email if Resend is configured
        if (resend && process.env.CONTACT_EMAIL_TO) {
          try {
            const emailData = await resend.emails.send({
              from: process.env.CONTACT_EMAIL_FROM || "Bun Stack <onboarding@resend.dev>",
              to: [process.env.CONTACT_EMAIL_TO],
              subject: `New Bun Stack Contact Submission from ${data.name}`,
              replyTo: data.email,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">New Contact Form Submission</h2>
                  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-top: 20px;">
                    <p style="margin: 10px 0;"><strong>Name:</strong> ${data.name}</p>
                    <p style="margin: 10px 0;"><strong>Email:</strong> ${data.email}</p>
                    <p style="margin: 10px 0;"><strong>Message:</strong></p>
                    <p style="white-space: pre-wrap; background-color: white; padding: 15px; border-radius: 4px; margin-top: 5px;">
                      ${data.message}
                    </p>
                  </div>
                  <p style="color: #666; font-size: 12px; margin-top: 20px;">
                    This email was sent from the Bun Stack contact form.
                  </p>
                </div>
              `,
              text: `
New Contact Form Submission

Name: ${data.name}
Email: ${data.email}
Message:
${data.message}

---
This email was sent from the Bun Stack contact form.
              `,
            });

            console.log("✅ Email sent successfully:", emailData);
          } catch (emailError) {
            console.error("❌ Failed to send email:", emailError);
            // Don't fail the request if email fails, user experience is more important
          }
        } else {
          console.log("⚠️ Resend not configured - skipping email send");
        }

        return Response.json({
          success: true,
          message: "Thank you for your message! We'll get back to you soon.",
        });
      } catch (error) {
        console.error("Contact form error:", error);
        return Response.json({ error: "Invalid request" }, { status: 400 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }


  // Serve static files
  try {
    // Try public directory first
    const publicFile = Bun.file(join(publicDir, pathname));
    if (await publicFile.exists()) {
      // Get the correct MIME type
      const mimeTypes: Record<string, string> = {
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
      };

      const ext = pathname.substring(pathname.lastIndexOf("."));
      const contentType = mimeTypes[ext] || "application/octet-stream";

      return new Response(publicFile, {
        headers: {
          "Content-Type": contentType,
        },
      });
    }

    // Try dist directory for built assets
    const distFile = Bun.file(join(distDir, pathname));
    if (await distFile.exists()) {
      return new Response(distFile);
    }
  } catch (e) {
    // File doesn't exist, continue to serve index.html
  }

  // For all other routes, serve the SPA
  const indexFile = Bun.file(join(publicDir, "index.html"));
  let html = await indexFile.text();

  // Inject HMR script in development mode
  if (process.env.DEV_MODE === "true") {
    const hmrScript = `
      <script>
        // Simple HMR - reload on file changes
        let lastReload = Date.now();
        setInterval(async () => {
          try {
            const res = await fetch('/api/hmr-check');
            const data = await res.json();
            if (data.time > lastReload) {
              console.log('🔄 Reloading...');
              window.location.reload();
            }
          } catch (e) {
            // Server might be restarting
          }
        }, 1000);
      </script>
    `;
    html = html.replace("</body>", hmrScript + "</body>");
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}

const server = serve({
  port: process.env.PORT || 3000,
  fetch: router,
});

console.log(`🚀 Bun Stack landing page running at http://localhost:${server.port}`);
