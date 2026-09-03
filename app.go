package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// FileInfo represents file data sent to frontend
type FileInfo struct {
	Path    string `json:"path"`
	Name    string `json:"name"`
	Content string `json:"content"`
	ModTime int64  `json:"modTime"`
	Size    int64  `json:"size"`
}

// App struct
type App struct {
	ctx          context.Context
	initialFiles []string
	watcher      *fsnotify.Watcher
	watchedFiles map[string]int64
	watchMu      sync.Mutex
}

// NewApp creates a new App application struct
func NewApp(initialFiles []string) *App {
	return &App{
		initialFiles: initialFiles,
		watchedFiles: make(map[string]int64),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	watcher, err := fsnotify.NewWatcher()
	if err == nil {
		a.watcher = watcher
		go a.runFileWatcher()
	}
}

// shutdown cleans up resources
func (a *App) shutdown(ctx context.Context) {
	if a.watcher != nil {
		_ = a.watcher.Close()
	}
}

// GetInitialFiles returns the file paths passed via CLI at startup
func (a *App) GetInitialFiles() []string {
	return a.initialFiles
}

// OpenFileDialog opens the native file chooser for Markdown files
func (a *App) OpenFileDialog() (string, error) {
	selected, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Open Markdown Document",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Markdown Files (*.md, *.markdown)",
				Pattern:     "*.md;*.markdown;*.mdown;*.mkdn",
			},
			{
				DisplayName: "All Text Files (*.txt, *.*)",
				Pattern:     "*.*",
			},
		},
	})
	if err != nil {
		return "", err
	}
	return selected, nil
}

// SaveFileDialog prompts the user with the native Save As dialog
func (a *App) SaveFileDialog(defaultFilename string) (string, error) {
	if defaultFilename == "" {
		defaultFilename = "Untitled.md"
	}
	selected, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save Markdown Document",
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Markdown Files (*.md)",
				Pattern:     "*.md",
			},
			{
				DisplayName: "All Files (*.*)",
				Pattern:     "*.*",
			},
		},
	})
	if err != nil {
		return "", err
	}
	return selected, nil
}

// ReadFile reads and returns the file content and metadata
func (a *App) ReadFile(filePath string) (*FileInfo, error) {
	cleanPath := filepath.Clean(filePath)
	absPath, err := filepath.Abs(cleanPath)
	if err != nil {
		absPath = cleanPath
	}

	info, err := os.Stat(absPath)
	if err != nil {
		return nil, fmt.Errorf("file not found: %w", err)
	}

	data, err := os.ReadFile(absPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	a.WatchFile(absPath)

	return &FileInfo{
		Path:    absPath,
		Name:    filepath.Base(absPath),
		Content: string(data),
		ModTime: info.ModTime().UnixMilli(),
		Size:    info.Size(),
	}, nil
}

// SaveFile writes content atomically using a temporary file
func (a *App) SaveFile(filePath string, content string) (*FileInfo, error) {
	cleanPath := filepath.Clean(filePath)
	absPath, err := filepath.Abs(cleanPath)
	if err != nil {
		absPath = cleanPath
	}

	dir := filepath.Dir(absPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create directory: %w", err)
	}

	// Create temp file in the same directory for atomic rename
	tempFile, err := os.CreateTemp(dir, ".tex-tmp-*")
	if err != nil {
		// Fallback to direct write if temp file fails
		if writeErr := os.WriteFile(absPath, []byte(content), 0644); writeErr != nil {
			return nil, writeErr
		}
	} else {
		tempPath := tempFile.Name()
		if _, writeErr := tempFile.WriteString(content); writeErr != nil {
			tempFile.Close()
			_ = os.Remove(tempPath)
			return nil, writeErr
		}
		_ = tempFile.Sync()
		tempFile.Close()

		if renErr := os.Rename(tempPath, absPath); renErr != nil {
			// On Windows, target might need to be removed if rename fails
			_ = os.Remove(absPath)
			if renErr2 := os.Rename(tempPath, absPath); renErr2 != nil {
				_ = os.Remove(tempPath)
				return nil, renErr2
			}
		}
	}

	stat, err := os.Stat(absPath)
	if err != nil {
		return nil, err
	}

	a.watchMu.Lock()
	a.watchedFiles[absPath] = stat.ModTime().UnixMilli()
	a.watchMu.Unlock()

	a.WatchFile(absPath)

	return &FileInfo{
		Path:    absPath,
		Name:    filepath.Base(absPath),
		Content: content,
		ModTime: stat.ModTime().UnixMilli(),
		Size:    stat.Size(),
	}, nil
}

// WatchFile adds path to fsnotify watcher
func (a *App) WatchFile(filePath string) {
	if a.watcher == nil {
		return
	}
	absPath, err := filepath.Abs(filepath.Clean(filePath))
	if err != nil {
		return
	}

	a.watchMu.Lock()
	defer a.watchMu.Unlock()

	stat, err := os.Stat(absPath)
	if err != nil {
		return
	}
	a.watchedFiles[absPath] = stat.ModTime().UnixMilli()

	// Watch the containing directory so file renames / atomic saves are detected
	dir := filepath.Dir(absPath)
	_ = a.watcher.Add(dir)
}

// UnwatchFile stops watching the file
func (a *App) UnwatchFile(filePath string) {
	absPath, err := filepath.Abs(filepath.Clean(filePath))
	if err != nil {
		return
	}
	a.watchMu.Lock()
	defer a.watchMu.Unlock()
	delete(a.watchedFiles, absPath)
}

func (a *App) runFileWatcher() {
	for {
		select {
		case event, ok := <-a.watcher.Events:
			if !ok {
				return
			}
			if event.Op&(fsnotify.Write|fsnotify.Create) != 0 {
				cleanEventPath := filepath.Clean(event.Name)

				a.watchMu.Lock()
				lastMod, watched := a.watchedFiles[cleanEventPath]
				if watched {
					stat, err := os.Stat(cleanEventPath)
					if err == nil {
						curMod := stat.ModTime().UnixMilli()
						// Debounce rapid writes within 300ms
						if curMod > lastMod+300 {
							a.watchedFiles[cleanEventPath] = curMod
							a.watchMu.Unlock()
							runtime.EventsEmit(a.ctx, "file:modified", cleanEventPath)
							continue
						}
					}
				}
				a.watchMu.Unlock()
			}
		case <-a.watcher.Errors:
			time.Sleep(100 * time.Millisecond)
		}
	}
}
