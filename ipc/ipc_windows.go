//go:build windows

package ipc

import (
	"context"
	"fmt"
	"io"
	"net"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/Microsoft/go-winio"
)

// IPC manages single-instance CLI forwarding on Windows
type IPC struct {
	listener net.Listener
	pipePath string
	mu       sync.Mutex
	closed   bool
}

// GetPipePath returns named pipe path for current Windows user
func GetPipePath() string {
	user := os.Getenv("USERNAME")
	if user == "" {
		user = "default"
	}
	return fmt.Sprintf(`\\.\pipe\tex-ipc-%s`, user)
}

// TryForwardCLI attempts to connect to an existing running instance on Windows
func TryForwardCLI(files []string) bool {
	pipePath := GetPipePath()
	timeout := 500 * time.Millisecond
	conn, err := winio.DialPipe(pipePath, &timeout)
	if err != nil {
		return false
	}
	defer conn.Close()

	payload := strings.Join(files, "\n") + "\n"
	_, err = conn.Write([]byte(payload))
	return err == nil
}

// StartServer starts named pipe listener on Windows
func StartServer(ctx context.Context, onFilesReceived func([]string)) (*IPC, error) {
	pipePath := GetPipePath()

	cfg := &winio.PipeConfig{
		SecurityDescriptor: "",
		MessageMode:        false,
		InputBufferSize:    65536,
		OutputBufferSize:   65536,
	}

	listener, err := winio.ListenPipe(pipePath, cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to listen on pipe %s: %w", pipePath, err)
	}

	ipc := &IPC{
		listener: listener,
		pipePath: pipePath,
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
				if err != nil && err != io.EOF {
					return
				}
				if n == 0 {
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

// Close stops the named pipe listener
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
}
