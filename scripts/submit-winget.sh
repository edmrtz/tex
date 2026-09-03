#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/submit-winget.sh [VERSION] [INSTALLER_URL] [INSTALLER_SHA256]
VERSION="${1:-0.1.0}"
INSTALLER_URL="${2:-https://github.com/edmrtz/tex/releases/download/v${VERSION}/tex-windows-amd64-installer.exe}"
INSTALLER_SHA256="${3:-}"

MANIFEST_DIR="packaging/winget/manifests/e/edmrtz/tex/${VERSION}"

if [ -n "$INSTALLER_SHA256" ]; then
  sed -i "s/InstallerSha256:.*/InstallerSha256: ${INSTALLER_SHA256}/" "${MANIFEST_DIR}/edmrtz.tex.installer.yaml"
fi

echo "==> Winget manifests ready at: ${MANIFEST_DIR}"
echo ""
echo "To submit manually using wingetcreate (on Windows):"
echo "  wingetcreate submit ${MANIFEST_DIR}"
echo ""
echo "Or using wingetcreate directly from GitHub release:"
echo "  wingetcreate new \"${INSTALLER_URL}\""
