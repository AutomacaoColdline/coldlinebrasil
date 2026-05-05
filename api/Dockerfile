FROM golang:1.22-alpine AS build
WORKDIR /app
COPY . .
RUN go mod tidy && CGO_ENABLED=0 go build -o server ./cmd/server

FROM alpine:3.19
WORKDIR /app
COPY --from=build /app/server .
RUN mkdir -p wwwroot/uploads
EXPOSE 4000
CMD ["./server"]
