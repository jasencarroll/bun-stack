# Use the official Bun image
FROM oven/bun:1.2.17-alpine

# Set working directory
WORKDIR /app

# Copy SPA package files
COPY SPA/package.json SPA/bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy SPA source files
COPY SPA/ .

# Build the application
RUN bun run build

# Expose port (Railway will override this)
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start the server
CMD ["bun", "start"]