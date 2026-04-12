FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy only required files first
COPY go.mod go.sum ./

# Copy source code
COPY . .

# Build with verbose output (helps debug if needed)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -v -ldflags="-w -s" -o bin/server ./cmd/server

# Final stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

COPY --from=builder /app/bin/server .
COPY --from=builder /app/.env.example .env

EXPOSE 8080

CMD ["./server"]
