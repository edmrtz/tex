package main

import (
	"context"
	"embed"
	"os"
	"path/filepath"
	"strings"
	"tex/ipc"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Workaround for WebKitGTK black window on Linux with NVIDIA / Wayland / compositors
	if os.Getenv("WEBKIT_DISABLE_DMABUF_RENDERER") == "" {
		_ = os.Setenv("WEBKIT_DISABLE_DMABUF_RENDERER", "1")
	}
	// Parse command line arguments (skip executable path)
	var cliFiles []string
	if len(os.Args) > 1 {
		for _, arg := range os.Args[1:] {
			if arg != "" && arg[0] != '-' {
				isDir := strings.HasSuffix(arg, "/") || strings.HasSuffix(arg, "\\")
				abs, err := filepath.Abs(arg)
				if err == nil {
					fi, statErr := os.Stat(abs)
					if isDir || (statErr == nil && fi.IsDir()) {
						_ = os.MkdirAll(abs, 0755)
					} else if os.IsNotExist(statErr) {
						_ = os.MkdirAll(filepath.Dir(abs), 0755)
						_ = os.WriteFile(abs, []byte(""), 0644)
					}
					cliFiles = append(cliFiles, abs)
				} else {
					cliFiles = append(cliFiles, arg)
				}
			}
		}
	}

	// Single instance check: if another instance is running, pass CLI files and exit
	if ipc.TryForwardCLI(cliFiles) {
		os.Exit(0)
	}

	// Create an instance of the app structure
	app := NewApp(cliFiles)

	// Context for background IPC listener
	ipcCtx, cancelIPC := context.WithCancel(context.Background())
	defer cancelIPC()

	_, _ = ipc.StartServer(ipcCtx, func(receivedFiles []string) {
		for _, f := range receivedFiles {
			isDir := strings.HasSuffix(f, "/") || strings.HasSuffix(f, "\\")
			if fi, statErr := os.Stat(f); isDir || (statErr == nil && fi.IsDir()) {
				_ = os.MkdirAll(f, 0755)
			} else if os.IsNotExist(statErr) {
				_ = os.MkdirAll(filepath.Dir(f), 0755)
				_ = os.WriteFile(f, []byte(""), 0644)
			}
		}
		if app.ctx != nil {
			runtime.WindowUnminimise(app.ctx)
			runtime.WindowShow(app.ctx)
			runtime.Show(app.ctx)
			runtime.EventsEmit(app.ctx, "cli:open-files", receivedFiles)
		}
	})

	// Create application with options
	err := wails.Run(&options.App{
		Title:     "Tex",
		Width:     1080,
		Height:    740,
		Frameless: true,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 13, G: 13, B: 15, A: 255}, // Match dark sidebar
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		EnableDefaultContextMenu: false,
		DragAndDrop: &options.DragAndDrop{
			EnableFileDrop:     true,
			DisableWebViewDrop: false,
		},
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
