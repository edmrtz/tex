.PHONY: dev build build-linux build-windows install-linux install-desktop package-linux clean

WAILS := $(shell which wails 2>/dev/null || echo $(HOME)/go/bin/wails)
PREFIX ?= $(HOME)/.local
VERSION ?= 0.1.0

dev:
	$(WAILS) dev -tags webkit2_41

build: build-linux

build-linux:
	$(WAILS) build -tags webkit2_41

build-windows:
	$(WAILS) build -platform windows/amd64 -nsis

install-linux: build-linux
	mkdir -p $(PREFIX)/bin
	cp build/bin/tex $(PREFIX)/bin/tex
	@echo "Installed tex to $(PREFIX)/bin/tex"

install-desktop: install-linux
	mkdir -p $(PREFIX)/share/applications
	mkdir -p $(PREFIX)/share/icons/hicolor/1024x1024/apps
	cp build/linux/tex.desktop $(PREFIX)/share/applications/tex.desktop
	cp build/appicon.png $(PREFIX)/share/icons/hicolor/1024x1024/apps/tex.png
	@for size in 16 32 48 64 128 256 512; do \
		mkdir -p $(PREFIX)/share/icons/hicolor/$${size}x$${size}/apps; \
		ln -sf $(PREFIX)/share/icons/hicolor/1024x1024/apps/tex.png $(PREFIX)/share/icons/hicolor/$${size}x$${size}/apps/tex.png; \
	done
	@command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -f -q $(PREFIX)/share/icons/hicolor || true
	@command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database $(PREFIX)/share/applications || true
	@echo "Installed desktop entry and icons to $(PREFIX)/share"

package-linux: build-linux
	mkdir -p build/dist/tex-linux-amd64
	cp build/bin/tex build/dist/tex-linux-amd64/tex
	cp build/linux/tex.desktop build/dist/tex-linux-amd64/tex.desktop
	cp build/appicon.png build/dist/tex-linux-amd64/appicon.png
	cp LICENSE build/dist/tex-linux-amd64/LICENSE
	cd build/dist/tex-linux-amd64 && tar -czvf ../../bin/tex-linux-amd64.tar.gz tex tex.desktop appicon.png LICENSE
	rm -rf build/dist
	@echo "Packaged build/bin/tex-linux-amd64.tar.gz"

clean:
	rm -rf build/bin/tex* build/dist frontend/dist
