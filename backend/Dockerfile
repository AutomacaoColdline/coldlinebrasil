FROM golang:1.22-alpine AS builder

WORKDIR /app

# Cache go mod download
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o bin/server ./cmd/server

FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

COPY --from=builder /app/bin/server .
COPY --from=builder /app/.env.example .env

EXPOSE 8080

CMD ["./server"]
