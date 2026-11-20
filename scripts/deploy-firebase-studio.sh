#!/usr/bin/env bash
# Run in Google Cloud Shell (signed in to the Firebase project):
#   bash <(curl -fsSL https://raw.githubusercontent.com/akashgupta0001/prabhat-website/main/scripts/deploy-firebase-studio.sh)
# Builds the stand-alone Photo Studio from this repository and publishes it to pbtps.web.app.
set -euo pipefail
PROJECT=prabhat-b9cb8
SITE=pbtps
DIR="$HOME/ps-build"
rm -rf "$DIR"
git clone -q --depth 1 https://github.com/akashgupta0001/prabhat-website "$DIR"
cd "$DIR"
bash scripts/build-firebase-studio.sh
firebase hosting:sites:create "$SITE" --project "$PROJECT" >/dev/null 2>&1 || true
cd firebase-studio
firebase deploy --only "hosting:$SITE" --project "$PROJECT" --non-interactive
echo "PS_DEPLOY_DONE https://$SITE.web.app"
