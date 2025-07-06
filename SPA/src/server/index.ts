import { serve } from "bun";
import { join } from "path";
import { Resend } from "resend";
import { docs } from "./routes/docs";

const publicDir = join(import.meta.dir, "../../public");
const distDir = join(import.meta.dir, "../../dist");
const hmrFile = join(import.meta.dir, "../../.hmr-timestamp");

// Initialize Resend with API key from environment
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 requests per hour per IP

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

    // Documentation routes
    if (pathname.startsWith("/api/docs")) {
      const docsPath = pathname.replace("/api/docs", "");
      
      // Match the path to the appropriate handler
      if (docsPath === "" || docsPath === "/") {
        const handler = docs["/"][req.method as keyof typeof docs["/"]];
        if (handler) {
          return handler(req);
        }
      } else if (docsPath === "/search") {
        const handler = docs["/search"][req.method as keyof typeof docs["/search"]];
        if (handler) {
          return handler(req);
        }
      } else {
        // Handle wildcard routes
        const handler = docs["/*"][req.method as keyof typeof docs["/*"]];
        if (handler) {
          return handler(req);
        }
      }
      
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (pathname === "/api/contact" && req.method === "POST") {
      try {
        // Get client IP for rate limiting
        const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
        
        // Check rate limit
        const now = Date.now();
        const userLimit = rateLimitMap.get(clientIp);
        
        if (userLimit) {
          if (now < userLimit.resetTime) {
            if (userLimit.count >= RATE_LIMIT_MAX) {
              return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
            }
            userLimit.count++;
          } else {
            // Reset the window
            userLimit.count = 1;
            userLimit.resetTime = now + RATE_LIMIT_WINDOW;
          }
        } else {
          rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        }

        const data = await req.json();

        // Validate and sanitize the data
        if (!data.name || !data.email || !data.message) {
          return Response.json({ error: "Name, email, and message are required" }, { status: 400 });
        }

        // Additional validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          return Response.json({ error: "Invalid email format" }, { status: 400 });
        }

        // Limit field lengths
        if (data.name.length > 100 || data.email.length > 100 || data.message.length > 1000) {
          return Response.json({ error: "Input too long" }, { status: 400 });
        }

        // Sanitize inputs (basic - remove any potential HTML/script tags)
        const sanitize = (str: string) => str.replace(/<[^>]*>/g, '').trim();
        data.name = sanitize(data.name);
        data.email = sanitize(data.email);
        data.message = sanitize(data.message);

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
        // Log error internally but don't expose details to client
        console.error("Contact form error:", error);
        return Response.json({ error: "An error occurred. Please try again later." }, { status: 500 });
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

      const headers: Record<string, string> = {
        "Content-Type": contentType,
      };

      // Add caching headers for static assets
      if (process.env.NODE_ENV === "production") {
        if (pathname.includes("/main.js") || pathname.includes("/styles.css")) {
          // Long cache for built assets (assuming they have hashes in production)
          headers["Cache-Control"] = "public, max-age=31536000, immutable";
        } else if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".gif" || ext === ".svg" || ext === ".ico") {
          // Cache images for a week
          headers["Cache-Control"] = "public, max-age=604800";
        } else {
          // Short cache for HTML and other files
          headers["Cache-Control"] = "public, max-age=3600";
        }
      }

      return new Response(publicFile, { headers });
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

  const headers: Record<string, string> = {
    "Content-Type": "text/html",
  };

  // Add security headers in production
  if (process.env.NODE_ENV === "production") {
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["X-XSS-Protection"] = "1; mode=block";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    headers["Permissions-Policy"] = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";
    headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self';";
  }

  return new Response(html, { headers });
}

// Clean up old rate limit entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, limit] of rateLimitMap.entries()) {
    if (now > limit.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 60 * 1000);

const server = serve({
  port: process.env.PORT || 3001,
  fetch: router,
});

console.log(`🚀 Bun Stack landing page running at http://localhost:${server.port}`);
