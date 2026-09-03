//go:build !windows

package ipc

import (
	"context"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// IPC manages single-instance CLI forwarding
type IPC struct {
	listener net.Listener
	sockPath string
	mu       sync.Mutex
	closed   bool
}

// GetSocketPath returns a user-safe socket path for Linux/macOS
func GetSocketPath() string {
	runtimeDir := os.Getenv("XDG_RUNTIME_DIR")
	if runtimeDir != "" {
		return filepath.Join(runtimeDir, "tex-ipc.sock")
	}
	return filepath.Join(os.TempDir(), fmt.Sprintf("tex-ipc-%d.sock", os.Getuid()))
}

// TryForwardCLI attempts to connect to an existing running instance.
// If an instance exists, it sends the files separated by newlines and returns true.
// If no instance exists, it returns false.
func TryForwardCLI(files []string) bool {
	sockPath := GetSocketPath()
	conn, err := net.Dial("unix", sockPath)
	if err != nil {
		return false
	}
	defer conn.Close()

	payload := strings.Join(files, "\n") + "\n"
	_, err = conn.Write([]byte(payload))
	return err == nil
}

// StartServer starts listening for CLI requests on Unix domain socket
func StartServer(ctx context.Context, onFilesReceived func([]string)) (*IPC, error) {
	sockPath := GetSocketPath()

	// Clean up stale socket if it exists
	if _, err := os.Stat(sockPath); err == nil {
		// Test if anything is actually listening
		conn, dialErr := net.Dial("unix", sockPath)
		if dialErr == nil {
			conn.Close()
			return nil, fmt.Errorf("instance already running on %s", sockPath)
		}
		// If dial failed, socket is stale, remove it
		_ = os.Remove(sockPath)
	}

	listener, err := net.Listen("unix", sockPath)
	if err != nil {
		return nil, fmt.Errorf("failed to listen on socket %s: %w", sockPath, err)
	}

	ipc := &IPC{
		listener: listener,
		sockPath: sockPath,
	}

	go func() {
		<-ctx.Done()
		ipc.Close()
	}()

	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				ipc.mu.Lock()
				isClosed := ipc.closed
				ipc.mu.Unlock()
				if isClosed {
					return
				}
				continue
			}

			go func(c net.Conn) {
				defer c.Close()
				buf := make([]byte, 8192)
				n, err := c.Read(buf)
				if err != nil || n == 0 {
					return
				}

				raw := strings.TrimSpace(string(buf[:n]))
				if raw == "" {
					onFilesReceived([]string{})
					return
				}

				lines := strings.Split(raw, "\n")
				var validFiles []string
				for _, l := range lines {
					trimmed := strings.TrimSpace(l)
					if trimmed != "" {
						validFiles = append(validFiles, trimmed)
					}
				}
				onFilesReceived(validFiles)
			}(conn)
		}
	}()

	return ipc, nil
}

// Close terminates the listener and cleans up the socket
func (i *IPC) Close() {
	i.mu.Lock()
	defer i.mu.Unlock()
	if i.closed {
		return
	}
	i.closed = true
	if i.listener != nil {
		_ = i.listener.Close()
	}
	if i.sockPath != "" {
		_ = os.Remove(i.sockPath)
	}
}
