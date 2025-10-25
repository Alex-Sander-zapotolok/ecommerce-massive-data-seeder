# Dockerfile to run the Bun seeder
FROM oven/bun:latest

WORKDIR /app

# Copy package and lock first for better caching
COPY package.json package.json
COPY .env.example .env.example

# Install dependencies
RUN bun install --production

# Copy the rest of the repo
COPY . .

# Add a small entrypoint that waits for the DB to be ready before running the seeder
COPY scripts/wait-and-run.sh /app/wait-and-run.sh
RUN chmod +x /app/wait-and-run.sh

ENTRYPOINT ["/app/wait-and-run.sh"]
