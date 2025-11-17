.PHONY: help install dev build start lint clean format type-check

# Load PORT from .env.local file or use default from package.json
# Next.js uses -p flag, so we check for PORT env var or default to 3000
PORT := $(shell grep -E '^PORT=' .env.local 2>/dev/null | cut -d '=' -f2 || echo 3000)

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

dev: ## Run development server (reads PORT from .env.local or defaults to 3000)
	@PORT=$(PORT) npm run dev

build: ## Build for production
	npm run build

start: ## Start production server
	npm start

lint: ## Run ESLint
	npm run lint

lint-fix: ## Run ESLint and auto-fix issues
	npm run lint -- --fix

type-check: ## Run TypeScript type checking
	npx tsc --noEmit

clean: ## Clean build artifacts and node_modules
	rm -rf .next
	rm -rf node_modules
	rm -rf .turbo
	rm -f package-lock.json
	rm -f yarn.lock
	rm -f pnpm-lock.yaml

format-check: ## Check code formatting
	npx prettier --check .

format: ## Format code with Prettier
	npx prettier --write .

setup: ## Initial setup: install dependencies
	npm install
	@echo "Setup complete! Run 'make dev' to start the development server."

