---
name: Termux portability
description: Environment-specific requirements for running this Node.js WhatsApp bot outside Replit.
---

Termux installations must use the public npm registry and install Node.js native build tools before installing dependencies. Replit can rewrite lockfile tarball URLs to an internal package firewall host that is unavailable on Android, and `better-sqlite3` needs Python, make, clang, and pkg-config to build or install correctly.

**Why:** Replit and Termux do not share the same package network or native build environment, so a lockfile that works on Replit can fail on a phone even when the package versions are valid.

**How to apply:** Keep the lockfile on public `registry.npmjs.org` URLs, use `npm ci --omit=dev --registry=https://registry.npmjs.org`, and run `termux-setup.sh` before `npm start`.