# syntax=docker/dockerfile:1.7
FROM golang:1.22-alpine AS build
WORKDIR /app

# Copia dependências primeiro para aproveitar cache de camadas.
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Copia o restante e compila sem 'go mod tidy' (economiza espaço no build).
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o server ./cmd/server

FROM alpine:3.19
WORKDIR /app
COPY --from=build /app/server .
RUN mkdir -p wwwroot/uploads
EXPOSE 4000
CMD ["./server"]
