# Multi-stage Python Dockerfile
# Build stage
FROM python:{{pythonVersion}}-slim AS builder

WORKDIR /app

# Install system dependencies for building
RUN apt-get update && apt-get install -y \\
    build-essential \\
    gcc \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY {{packageFile}} .

# Create virtual environment and install dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip
RUN pip install -r {{packageFile}}

# Production stage
FROM python:{{pythonVersion}}-slim AS production

# Create app user
RUN groupadd -r app && useradd -r -g app app

WORKDIR /app

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY --chown=app:app . .

# Expose port
EXPOSE {{port}}

# Switch to non-root user
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:{{port}}/health')" || exit 1

# Start the application
{{#if startCommand}}
CMD {{startCommand}}
{{else}}
CMD ["python", "app.py"]
{{/if}}