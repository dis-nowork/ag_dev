# Multi-stage Ruby Dockerfile
# Build stage
FROM ruby:{{rubyVersion}}-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \\
    build-base \\
    postgresql-dev \\
    nodejs \\
    yarn

# Copy Gemfile
COPY Gemfile Gemfile.lock ./

# Install gems
RUN bundle config set --local deployment 'true'
RUN bundle config set --local without 'development test'
RUN bundle install

# Production stage
FROM ruby:{{rubyVersion}}-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \\
    postgresql-client \\
    nodejs \\
    tzdata

# Create app user
RUN addgroup -g 1001 -S rails
RUN adduser -S rails -u 1001 -G rails

WORKDIR /app

# Copy gems from builder stage
COPY --from=builder /usr/local/bundle /usr/local/bundle

# Copy application code
COPY --chown=rails:rails . .

# Expose port
EXPOSE {{port}}

# Switch to non-root user
USER rails

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:{{port}}/health || exit 1

# Start the application
{{#if startCommand}}
CMD {{startCommand}}
{{else}}
CMD ["rails", "server", "-b", "0.0.0.0"]
{{/if}}