#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/update-aur.sh [VERSION]
VERSION="${1:-}"

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version> (e.g. 0.1.0)"
  exit 1
fi

echo "==> Updating AUR package tex-bin for version ${VERSION}..."
AUR_DIR="packaging/aur/tex-bin"

sed -i "s/^pkgver=.*/pkgver=${VERSION}/" "${AUR_DIR}/PKGBUILD"
sed -i "s/^pkgrel=.*/pkgrel=1/" "${AUR_DIR}/PKGBUILD"

TARBALL="build/bin/tex-linux-amd64.tar.gz"
if [ -f "$TARBALL" ]; then
  SHA=$(sha256sum "$TARBALL" | awk '{print $1}')
  echo "==> Using local tarball checksum: ${SHA}"
  sed -i "s/^sha256sums=.*/sha256sums=('${SHA}')/" "${AUR_DIR}/PKGBUILD"
else
  echo "==> Tarball not found locally, running updpkgsums if available..."
  if command -v updpkgsums >/dev/null 2>&1; then
    (cd "${AUR_DIR}" && updpkgsums)
  fi
fi

echo "==> Regenerating .SRCINFO..."
(cd "${AUR_DIR}" && makepkg --printsrcinfo > .SRCINFO)

echo "==> Done. AUR files updated in ${AUR_DIR}."
echo "To publish to AUR:"
echo "  cd /path/to/cloned/tex-bin-aur"
echo "  cp /path/to/tex/packaging/aur/tex-bin/{PKGBUILD,.SRCINFO} ."
echo "  git commit -am 'Update to v${VERSION}'"
echo "  git push"
