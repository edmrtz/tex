# Tex ⚡

> **Tex** is a minimalist, distraction-free markdown notepad with Obsidian-style live rendering, KaTeX math equations, Mermaid diagrams, and seamless CLI capabilities.

Built with **Go (Wails v2)**, **Svelte 5**, and **CodeMirror 6**.

---

## Features

- **Obsidian-Style Live Preview**: Headings, bold, italic, strikethrough, blockquotes, and interactive task checklists render directly in place. Markdown markup characters automatically reveal when your cursor touches them.
- **Academic Math (KaTeX)**: Real-time rendering of inline math (`$E=mc^2$`) and display blocks (`$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$`).
- **Diagrams (Mermaid.js)**: Flowcharts, sequence diagrams, and mindmaps render inline inside `mermaid` fenced code blocks.
- **Syntax Highlighted Code Blocks**: Full programming language support (`bash`, `python`, `go`, `javascript`, `json`, etc.) with dark-themed syntax highlighting.
- **Sidebar Workspace Tree**: Fast, distraction-free file tree with automatic markdown discovery, real-time search, and collapsible sidebar.
- **CLI & Single-Instance IPC**:
  - Run `tex` to open a blank notepad.
  - Run `tex note.md` to open or view files.
  - If Tex is already open, running `tex another.md` brings the existing window to the foreground and opens the file directly.
- **Atomic File Operations**: Prevents file corruption via atomic writes and monitors external edits with `fsnotify`.
- **Drag & Drop**: Drop markdown files directly into the window.
- **Cross-Platform**: Designed for both **Linux** (WebKitGTK) and **Windows** (WebView2).

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + B` / `Ctrl + \` | Toggle Sidebar |
| `Ctrl + N` | Create a new blank note |
| `Ctrl + O` | Open file dialog |
| `Ctrl + Shift + O` | Open workspace folder |
| `Ctrl + S` | Save active file |
| `Ctrl + Shift + S` | Save file as... |
| `Ctrl + W` | Close active note (prompts if unsaved) |
| `Ctrl + Tab` / `Ctrl + Shift + Tab` | Switch between open notes |
| `Ctrl + E` | Toggle between **Live Preview** and **Raw Source** |
| `Ctrl + F` | Open Find & Replace bar |
| `Ctrl + =` / `Ctrl + -` | Zoom font in / out |
| `Ctrl + 0` | Reset font zoom |

---

## Installation

### Arch Linux (AUR)
Install using your preferred AUR helper:
```bash
# Binary release (recommended)
yay -S tex-bin
# or
paru -S tex-bin
```

### Windows (Winget)
Install via the Windows Package Manager:
```powershell
winget install edmrtz.tex
```
Or download the standalone NSIS setup installer from [GitHub Releases](https://github.com/edmrtz/tex/releases).

### Manual Download (Linux & Windows)
Pre-built archives and installers are available on the [GitHub Releases](https://github.com/edmrtz/tex/releases) page:
- **Linux (x86_64)**: `tex-linux-amd64.tar.gz`
- **Windows (x86_64)**: `tex-windows-amd64-installer.exe` or portable `tex-windows-amd64.zip`

---

## Building from Source

### Requirements
- **Go 1.22+**
- **Node.js 18+** & `npm`
- **Wails v2**: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- On Linux: `webkit2gtk-4.1` (or `webkit2gtk-4.0`) and `gtk3`

### Development
```bash
make dev
```

### Build for Linux
```bash
make build-linux
# Binary is output to build/bin/tex
```

### Install with Desktop Launcher on Linux (`~/.local`)
```bash
make install-desktop
```

### Build for Windows
```bash
make build-windows
# Binary is output to build/bin/tex.exe
```

For maintainers and packaging details, see [RELEASE_GUIDE.md](file:///home/mrtz/Projects/tex/RELEASE_GUIDE.md).

---

## License
MIT
