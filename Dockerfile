# Dockerfile to run the Bun seeder
FROM jarredsumner/bun:latest

WORKDIR /app

# Copy package and lock first for better caching
COPY package.json package.json
COPY .env.example .env.example

# Install dependencies
RUN bun install --production

# Copy the rest of the repo
COPY . .

CMD ["bun", "run", "src/seed.js"]
