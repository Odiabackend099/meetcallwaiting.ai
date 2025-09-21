#!/usr/bin/env bash
set -euo pipefail
echo "Bootstrapping callwaiting.ai skeleton"
( cd apps/api && npm i )
( cd apps/tts-gateway && npm i )
echo "Done. Next: copy .env.example to .env in each app and run npm run dev."
