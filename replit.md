# Fast 1xBet Cash Bot

## Overview

This project is a Node.js WhatsApp bot built with Baileys. It stores bot data in a local SQLite database and uses Groq for payment-slip image analysis.

## Running on Replit

- The project uses Node.js 20 and starts with `npm start`.
- The Replit workflow is a console workflow because this bot does not serve a web page.
- `GROQ_API_KEY` must be configured as a Replit Secret before startup.
- On first startup, scan the QR code printed in the workflow console with WhatsApp:
  `WhatsApp → Linked Devices → Link a Device`.
- After pairing, WhatsApp credentials are saved in `session/` and the SQLite database is saved in `data/`; both are ignored by Git.
- Optional configuration is provided through environment variables documented in `src/config/index.js`, including `ADMIN_IDS`, `PAIRING_PHONE_NUMBER`, and `LOG_LEVEL`.

## Running in Termux

- Install the project on Termux with `bash termux-setup.sh`; it installs Node.js LTS and the native tools required by `better-sqlite3`.
- Copy `.env.example` to `.env`, set `GROQ_API_KEY`, and start with `npm start`.
- The project entry point is `src/index.js`; do not use the older single-file `index.js` commands from previous documentation.

## User preferences

- Keep the existing Node.js structure and Baileys/SQLite stack.
- Do not replace the WhatsApp bot with a web application unless explicitly requested.