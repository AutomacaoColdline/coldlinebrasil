.PHONY: help build run docker-up docker-down test clean

help:
	@echo "Comandos disponíveis:"
	@echo "  make build       - Compilar o servidor"
	@echo "  make run         - Executar o servidor"
	@echo "  make docker-up   - Iniciar containers Docker"
	@echo "  make docker-down - Parar containers Docker"
	@echo "  make test        - Executar testes"
	@echo "  make clean       - Limpar artefatos"

build:
	@echo "Building server..."
	go build -o ./bin/server ./cmd/server

run: build
	@echo "Running server..."
	./bin/server

docker-up:
	@echo "Starting Docker containers..."
	docker-compose up -d
	@echo "✓ Server: http://localhost:8080"
	@echo "✓ Database: localhost:5432"

docker-down:
	@echo "Stopping Docker containers..."
	docker-compose down

docker-logs:
	docker-compose logs -f server

dev:
	@echo "Starting development server..."
	go run ./cmd/server

test:
	@echo "Running tests..."
	go test -v ./...

clean:
	@echo "Cleaning..."
	rm -rf ./bin
	go clean

fmt:
	@echo "Formatting code..."
	go fmt ./...

mod-tidy:
	@echo "Tidying dependencies..."
	go mod tidy
