# Tex Release & Distribution Guide

This guide describes how to publish new releases of **Tex** for Linux and Windows, as well as how to distribute it via the **Arch User Repository (AUR)** and **Windows Package Manager (Winget)**.

---

## 🚀 Quick Release Process

Tex uses **GitHub Actions** to automate multi-platform builds, checksum generation, and GitHub Release drafting.

### Step 1: Bump Version
Ensure the version in `wails.json` and `Makefile` is up to date:
- `wails.json` -> `"productVersion": "0.1.0"`
- `Makefile` -> `VERSION ?= 0.1.0`

### Step 2: Push to GitHub & Create Tag
```bash
git add .
git commit -m "chore: release v0.1.0"
git push origin main

# Create and push git tag
git tag v0.1.0
git push origin v0.1.0
```

### Step 3: Automated GitHub Actions Build
The `.github/workflows/release.yml` workflow will automatically:
1. Compile the Linux binary on `ubuntu-latest` and package `tex-linux-amd64.tar.gz`.
2. Compile the Windows binary & NSIS installer on `windows-latest` (`tex-windows-amd64-installer.exe` and `tex-windows-amd64.zip`).
3. Compute `SHA256SUMS.txt`.
4. Publish a GitHub Release with all binary assets attached.

---

## 📦 Arch Linux (AUR) Distribution

The official binary package on the AUR is **`tex-bin`**.

### Option A: Local Maintainer Update (Fastest & Easiest)
Once you have created your AUR account and cloned your AUR repo (`tex-bin`):
```bash
# 1. Update packaging/aur/tex-bin files
./scripts/update-aur.sh 0.1.0

# 2. Copy updated PKGBUILD and .SRCINFO to your AUR git workdir
cd /path/to/cloned/tex-bin-aur
cp /path/to/tex/packaging/aur/tex-bin/{PKGBUILD,.SRCINFO} .

# 3. Test build locally
makepkg -si

# 4. Commit and push to AUR
git add PKGBUILD .SRCINFO
git commit -m "Update to v0.1.0"
git push origin master
```

### Option B: Automated AUR Publishing via GitHub Actions
Add the secret `AUR_SSH_PRIVATE_KEY` in **GitHub Repository Settings -> Secrets and variables -> Actions**:
- The private SSH key associated with your `aur.archlinux.org` account.
- When present, the release workflow will automatically clone, update, and push the new release to AUR.

---

## 🪟 Windows Package Manager (Winget) Distribution

Package Identifier: **`edmrtz.tex`**

### Option A: Automated via GitHub Actions
Add the secret `WINGET_TOKEN` in **GitHub Repository Settings -> Secrets and variables -> Actions**:
- A GitHub Personal Access Token (classic) with `public_repo` permission.
- When present, the release workflow automatically forks `microsoft/winget-pkgs`, generates the manifests with the computed SHA256 of `tex-windows-amd64-installer.exe`, and opens a pull request.

### Option B: Using `wingetcreate` (From Windows Terminal)
Install the official Winget manifest creation tool:
```powershell
winget install wingetcreate
```
Submit the new release installer URL:
```powershell
wingetcreate new "https://github.com/edmrtz/tex/releases/download/v0.1.0/tex-windows-amd64-installer.exe"
```
Or submit using the provided manifest directory:
```powershell
wingetcreate submit packaging\winget\manifests\e\edmrtz\tex\0.1.0
```

---

## 🐧 Local Linux Installation

To install directly onto an Arch or Linux machine without building an AUR package:
```bash
make install-desktop
```
This installs:
- Binary: `~/.local/bin/tex`
- Application Launcher: `~/.local/share/applications/tex.desktop`
- Icon: `~/.local/share/icons/hicolor/1024x1024/apps/tex.png`
