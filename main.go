package main

import (
	"context"
	"embed"
	"os"
	"path/filepath"

	"tex/ipc"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Parse command line arguments (skip executable path)
	var cliFiles []string
	if len(os.Args) > 1 {
		for _, arg := range os.Args[1:] {
			if arg != "" && arg[0] != '-' {
				abs, err := filepath.Abs(arg)
				if err == nil {
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
		BackgroundColour: &options.RGBA{R: 18, G: 18, B: 20, A: 255}, // Dark TUI background
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		EnableDefaultContextMenu: true,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
