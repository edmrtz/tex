package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestFolderOperations(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "tex-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	app := NewApp(nil)

	// 1. Test IsDirectory
	isDir, err := app.IsDirectory(tempDir)
	if err != nil || !isDir {
		t.Errorf("Expected %s to be a directory, got %v, err: %v", tempDir, isDir, err)
	}

	// 2. Test CreateNewDirectory (e.g. university subject)
	subDir, err := app.CreateNewDirectory(tempDir, "Linear Algebra")
	if err != nil {
		t.Fatalf("Failed to create new directory: %v", err)
	}
	expectedSubDir := filepath.Join(tempDir, "Linear Algebra")
	if subDir != expectedSubDir {
		t.Errorf("Expected subDir %s, got %s", expectedSubDir, subDir)
	}
	isDir, err = app.IsDirectory(subDir)
	if err != nil || !isDir {
		t.Errorf("Expected %s to be directory", subDir)
	}

	// 3. Test CreateNewFile inside that subject folder
	noteInfo, err := app.CreateNewFile(subDir, "Lecture 1")
	if err != nil {
		t.Fatalf("Failed to create file: %v", err)
	}
	if filepath.Base(noteInfo.Path) != "Lecture 1.md" {
		t.Errorf("Expected file name 'Lecture 1.md', got %s", filepath.Base(noteInfo.Path))
	}
	isDir, err = app.IsDirectory(noteInfo.Path)
	if err != nil || isDir {
		t.Errorf("Expected %s to NOT be a directory", noteInfo.Path)
	}

	// 4. Create an empty subfolder
	emptySubDir, err := app.CreateNewDirectory(subDir, "Assignments")
	if err != nil {
		t.Fatalf("Failed to create empty subfolder: %v", err)
	}

	// 5. Test ReadDirectoryTree preserves both files and empty directories
	tree, err := app.ReadDirectoryTree(subDir, 6)
	if err != nil {
		t.Fatalf("Failed to read directory tree: %v", err)
	}
	if len(tree) != 2 {
		t.Fatalf("Expected 2 items in tree (1 dir, 1 file), got %d", len(tree))
	}

	var foundDir, foundFile bool
	for _, item := range tree {
		if item.IsDir && item.Name == "Assignments" {
			foundDir = true
			if item.Path != emptySubDir {
				t.Errorf("Expected path %s, got %s", emptySubDir, item.Path)
			}
		}
		if !item.IsDir && item.Name == "Lecture 1.md" {
			foundFile = true
		}
	}
	if !foundDir {
		t.Errorf("Assignments directory was not found in tree")
	}
	if !foundFile {
		t.Errorf("Lecture 1.md was not found in tree")
	}
}

func TestSessionFolders(t *testing.T) {
	app := NewApp(nil)

	folders := []string{"/tmp/subject1", "/tmp/subject2"}
	files := []string{"/tmp/subject1/note1.md"}
	active := "/tmp/subject1/note1.md"

	err := app.SaveSession("/tmp/subject1", folders, files, active)
	if err != nil {
		t.Fatalf("Failed to save session: %v", err)
	}

	loaded, err := app.LoadSession()
	if err != nil {
		t.Fatalf("Failed to load session: %v", err)
	}
	if loaded.LastFolder != "/tmp/subject1" {
		t.Errorf("Expected LastFolder /tmp/subject1, got %s", loaded.LastFolder)
	}
	if len(loaded.Folders) != 2 || loaded.Folders[0] != "/tmp/subject1" || loaded.Folders[1] != "/tmp/subject2" {
		t.Errorf("Expected folders %v, got %v", folders, loaded.Folders)
	}
	if len(loaded.OpenFiles) != 1 || loaded.OpenFiles[0] != files[0] {
		t.Errorf("Expected open files %v, got %v", files, loaded.OpenFiles)
	}
	if loaded.ActiveFile != active {
		t.Errorf("Expected active file %s, got %s", active, loaded.ActiveFile)
	}
}
