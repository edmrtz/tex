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
