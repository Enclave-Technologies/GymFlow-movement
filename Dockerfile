# Stage 1: Build the application
# Using a specific LTS version like node:22-alpine is often recommended for stability.
FROM node:23-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies needed for the build)
RUN npm ci --legacy-peer-deps

# Copy all application source code
COPY . .

# Build the Next.js application.
# This generates the .next folder, including the .next/standalone subdirectory.
RUN npm run build

# ---

# Stage 2: Production image (lean and secure)
FROM node:23-alpine AS runner

WORKDIR /app

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set environment variables for production
ENV NODE_ENV=production \
    PORT=3000

# Copy the minimal Next.js server from the standalone output
COPY --from=builder /app/.next/standalone ./

# Copy public assets and static files for the Next.js server
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# ========= ADDITIONS FOR WORKER PROCESS =========
# Based on your redis-queue-setup.md, your worker needs the following files.
# We copy them into the final image so "npm run worker" has everything it needs.

# 1. Copy package.json to be able to use "npm run" commands.
COPY --from=builder /app/package.json ./package.json

# 2. Copy the tsconfig.json file, which tsx uses to run your TypeScript files.
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# 3. Copy the scripts folder, which contains your worker entry point.
COPY --from=builder /app/scripts ./scripts

# 4. Copy the lib folder, containing your queue manager, worker logic, etc.
COPY --from=builder /app/lib ./lib

# 5. Copy the types folder for your message definitions.
COPY --from=builder /app/types ./types

# ========= END OF WORKER ADDITIONS =========

# Expose the port the Next.js app runs on
EXPOSE 3000

# Switch to the non-root user.
# NOTE: We do this *after* all file operations.
USER nextjs

# Healthcheck for the web process (no changes needed here)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application. This is the default command for the 'web' process.
# Sevalla will use "npm run worker" to start your other process.
CMD ["node", "server.js"]
