package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
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

// FileItem represents a file or folder in a workspace tree
type FileItem struct {
	Path     string     `json:"path"`
	Name     string     `json:"name"`
	IsDir    bool       `json:"isDir"`
	Children []FileItem `json:"children,omitempty"`
	ModTime  int64      `json:"modTime"`
	Size     int64      `json:"size"`
}

// WorkspaceInfo represents initial workspace and folder status
type WorkspaceInfo struct {
	CurrentDir   string     `json:"currentDir"`
	InitialFiles []string   `json:"initialFiles"`
	InitialTree  []FileItem `json:"initialTree"`
}

// App struct
type App struct {
	ctx          context.Context
	initialFiles []string
	currentDir   string
	watcher      *fsnotify.Watcher
	watchedFiles map[string]int64
	watchMu      sync.Mutex
}

// NewApp creates a new App application struct
func NewApp(initialFiles []string) *App {
	cwd, _ := os.Getwd()
	return &App{
		initialFiles: initialFiles,
		currentDir:   cwd,
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
func (a *App) SaveFileDialog(defaultDir string, defaultFilename string) (string, error) {
	if defaultFilename == "" {
		defaultFilename = "Untitled.md"
	}
	if defaultDir == "" {
		if a.currentDir != "" {
			defaultDir = a.currentDir
		} else {
			cwd, err := os.Getwd()
			if err == nil {
				defaultDir = cwd
			}
		}
	}
	selected, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:            "Save Markdown Document",
		DefaultDirectory: defaultDir,
		DefaultFilename:  defaultFilename,
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

// CreateNewFile creates a new empty file inside targetDir and returns its FileInfo
func (a *App) CreateNewFile(targetDir string, fileName string) (*FileInfo, error) {
	if targetDir == "" {
		targetDir = a.currentDir
		if targetDir == "" {
			cwd, err := os.Getwd()
			if err == nil {
				targetDir = cwd
			}
		}
	}
	trimmedName := strings.TrimSpace(fileName)
	if trimmedName == "" {
		trimmedName = "Untitled.md"
	}
	lower := strings.ToLower(trimmedName)
	if !strings.HasSuffix(lower, ".md") && !strings.HasSuffix(lower, ".markdown") {
		trimmedName = trimmedName + ".md"
	}

	fullPath := filepath.Join(targetDir, trimmedName)
	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return nil, fmt.Errorf("failed to create directory: %w", err)
	}

	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		if err := os.WriteFile(fullPath, []byte(""), 0644); err != nil {
			return nil, fmt.Errorf("failed to create file: %w", err)
		}
	}

	return a.ReadFile(fullPath)
}

// DeleteFile deletes a file or directory at targetPath
func (a *App) DeleteFile(targetPath string) error {
	clean := filepath.Clean(targetPath)
	abs, err := filepath.Abs(clean)
	if err != nil {
		abs = clean
	}
	a.UnwatchFile(abs)
	return os.RemoveAll(abs)
}

// MoveFile moves a file or folder from sourcePath to targetDir
func (a *App) MoveFile(sourcePath string, targetDir string) (*FileInfo, error) {
	srcClean := filepath.Clean(sourcePath)
	srcAbs, err := filepath.Abs(srcClean)
	if err != nil {
		srcAbs = srcClean
	}

	tgtClean := filepath.Clean(targetDir)
	tgtAbs, err := filepath.Abs(tgtClean)
	if err != nil {
		tgtAbs = tgtClean
	}

	fi, err := os.Stat(tgtAbs)
	if err != nil || !fi.IsDir() {
		return nil, fmt.Errorf("target is not a directory: %s", tgtAbs)
	}

	baseName := filepath.Base(srcAbs)
	destPath := filepath.Join(tgtAbs, baseName)

	if srcAbs == destPath {
		return a.ReadFile(destPath)
	}

	// Prevent moving directory into itself or child
	if strings.HasPrefix(tgtAbs, srcAbs+string(filepath.Separator)) {
		return nil, fmt.Errorf("cannot move folder into its own subfolder")
	}

	a.UnwatchFile(srcAbs)

	// Try atomic rename
	if err := os.Rename(srcAbs, destPath); err != nil {
		// Fallback for cross-device moves
		input, err := os.ReadFile(srcAbs)
		if err != nil {
			return nil, fmt.Errorf("failed to read source for move: %w", err)
		}
		if err := os.WriteFile(destPath, input, 0644); err != nil {
			return nil, fmt.Errorf("failed to write destination for move: %w", err)
		}
		_ = os.Remove(srcAbs)
	}

	return a.ReadFile(destPath)
}

// OpenDirectoryDialog prompts the user to select a workspace folder
func (a *App) OpenDirectoryDialog() (string, error) {
	defaultDir := a.currentDir
	if defaultDir == "" {
		defaultDir, _ = os.Getwd()
	}
	selected, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title:            "Open Workspace Folder",
		DefaultDirectory: defaultDir,
	})
	if err != nil {
		return "", err
	}
	if selected != "" {
		a.currentDir = selected
	}
	return selected, nil
}

// ReadDirectoryTree reads directory contents recursively for markdown and text files
func (a *App) ReadDirectoryTree(dirPath string, maxDepth int) ([]FileItem, error) {
	cleanPath := filepath.Clean(dirPath)
	absPath, err := filepath.Abs(cleanPath)
	if err != nil {
		absPath = cleanPath
	}

	if maxDepth <= 0 {
		maxDepth = 3
	}

	return a.readTreeRecursive(absPath, 1, maxDepth)
}

func (a *App) readTreeRecursive(currentDir string, depth, maxDepth int) ([]FileItem, error) {
	if depth > maxDepth {
		return nil, nil
	}

	entries, err := os.ReadDir(currentDir)
	if err != nil {
		return nil, err
	}

	var dirs []FileItem
	var files []FileItem

	for _, entry := range entries {
		name := entry.Name()
		// Skip hidden files, system files, and common build/dep folders
		if strings.HasPrefix(name, ".") || name == "node_modules" || name == "vendor" || name == "dist" || name == "build" {
			continue
		}

		fullPath := filepath.Join(currentDir, name)
		info, err := entry.Info()
		if err != nil {
			continue
		}

		if entry.IsDir() {
			children, _ := a.readTreeRecursive(fullPath, depth+1, maxDepth)
			// Only include directories that contain markdown files
			if len(children) > 0 {
				dirs = append(dirs, FileItem{
					Path:     fullPath,
					Name:     name,
					IsDir:    true,
					Children: children,
					ModTime:  info.ModTime().UnixMilli(),
				})
			}
		} else {
			ext := strings.ToLower(filepath.Ext(name))
			if ext == ".md" || ext == ".markdown" || ext == ".mdown" || ext == ".txt" {
				files = append(files, FileItem{
					Path:    fullPath,
					Name:    name,
					IsDir:   false,
					ModTime: info.ModTime().UnixMilli(),
					Size:    info.Size(),
				})
			}
		}
	}

	sort.Slice(dirs, func(i, j int) bool {
		return strings.ToLower(dirs[i].Name) < strings.ToLower(dirs[j].Name)
	})
	sort.Slice(files, func(i, j int) bool {
		return strings.ToLower(files[i].Name) < strings.ToLower(files[j].Name)
	})

	return append(dirs, files...), nil
}

// GetWorkspaceInfo returns current directory and startup files
func (a *App) GetWorkspaceInfo() (*WorkspaceInfo, error) {
	cwd, err := os.Getwd()
	if err != nil {
		cwd = ""
	}

	folder := cwd
	var files []string
	for _, f := range a.initialFiles {
		fi, err := os.Stat(f)
		if err == nil && fi.IsDir() {
			folder = f
		} else {
			files = append(files, f)
		}
	}

	var tree []FileItem
	if folder != "" {
		a.currentDir = folder
		tree, _ = a.ReadDirectoryTree(folder, 3)
	}

	return &WorkspaceInfo{
		CurrentDir:   folder,
		InitialFiles: files,
		InitialTree:  tree,
	}, nil
}

// ReadFile reads and returns the file content and metadata (creating it if it does not exist)
func (a *App) ReadFile(filePath string) (*FileInfo, error) {
	cleanPath := filepath.Clean(filePath)
	absPath, err := filepath.Abs(cleanPath)
	if err != nil {
		absPath = cleanPath
	}

	info, err := os.Stat(absPath)
	if os.IsNotExist(err) {
		dir := filepath.Dir(absPath)
		if mkErr := os.MkdirAll(dir, 0755); mkErr == nil {
			if writeErr := os.WriteFile(absPath, []byte(""), 0644); writeErr == nil {
				info, err = os.Stat(absPath)
			}
		}
	}
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
