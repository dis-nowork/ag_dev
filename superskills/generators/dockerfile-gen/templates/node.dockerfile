# Multi-stage Node.js Dockerfile
# Build stage
FROM node:{{nodeVersion}}-alpine AS builder

WORKDIR /app

# Copy package files
COPY {{packageFile}} ./
{{#if lockFile}}COPY {{lockFile}} ./{{/if}}

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:{{nodeVersion}}-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy built node modules and app source
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Expose port
EXPOSE {{port}}

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:{{port}}/health || exit 1

# Start the application
CMD ["npm", "start"]