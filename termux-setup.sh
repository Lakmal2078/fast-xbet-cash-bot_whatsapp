#!/data/data/com.termux/files/usr/bin/bash

set -eu

if ! command -v pkg >/dev/null 2>&1; then
  echo "This script must be run inside Termux."
  exit 1
fi

echo "Updating Termux packages..."
pkg update -y

echo "Installing Node.js and native build tools..."
pkg install -y nodejs-lts python make clang pkg-config

echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"

echo "Installing production dependencies..."
npm ci --omit=dev --registry=https://registry.npmjs.org

if [ ! -f .env ]; then
  cp .env.example .env
  chmod 600 .env
  echo
  echo "Created .env from .env.example."
  echo "Edit .env and set GROQ_API_KEY before starting the bot."
else
  echo ".env already exists; leaving it unchanged."
fi

mkdir -p data session

echo
echo "Setup complete."
echo "Next:"
echo "  nano .env"
echo "  npm start"