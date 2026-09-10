FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 python3-venv \
	&& rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy all backend source files
COPY . .

# The profile agent prefers this virtual environment when it exists.
RUN python3 -m venv ml/.venv \
	&& ml/.venv/bin/pip install --no-cache-dir -r ml/requirements.txt

CMD ["node", "server.js"]
