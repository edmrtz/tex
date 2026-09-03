.PHONY: dev build build-linux build-windows install-linux clean

WAILS := $(shell which wails 2>/dev/null || echo $(HOME)/go/bin/wails)
PREFIX ?= $(HOME)/.local

dev:
	$(WAILS) dev -tags webkit2_41

build: build-linux

build-linux:
	$(WAILS) build -tags webkit2_41

build-windows:
	$(WAILS) build -platform windows/amd64

install-linux: build-linux
	mkdir -p $(PREFIX)/bin
	cp build/bin/tex $(PREFIX)/bin/tex
	@echo "Installed tex to $(PREFIX)/bin/tex"

clean:
	rm -rf build/bin/tex* frontend/dist
