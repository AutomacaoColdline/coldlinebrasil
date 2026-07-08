FROM postgres:16-alpine
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
COPY server .
RUN mkdir -p wwwroot/uploads
EXPOSE 4000
CMD ["./server"]
