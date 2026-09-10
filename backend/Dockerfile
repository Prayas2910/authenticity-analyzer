FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy all backend source files
COPY . .

# Expose the port Fly.io will use
EXPOSE 8080

# Set PORT env var for the app
ENV PORT=8080

CMD ["node", "server.js"]
