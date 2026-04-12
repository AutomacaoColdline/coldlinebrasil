# 🚀 Quick Commands

## Build & Run

```bash
# Build fresh (no cache)
docker-compose build --no-cache

# Start containers
docker-compose up -d

# View logs
docker-compose logs -f
```

## Restart

```bash
# Restart everything
docker-compose restart

# Just the server
docker-compose restart server
```

## Stop & Clean

```bash
# Stop containers
docker-compose stop

# Remove containers
docker-compose down

# Remove everything including volumes
docker-compose down -v

# Remove images
docker rmi coldlinebrasil-backend-server postgres:16-alpine
```

## Debug

```bash
# Enter server container
docker-compose exec server /bin/sh

# View server logs
docker-compose logs -f server

# View postgres logs
docker-compose logs -f postgres

# Check running containers
docker-compose ps
```

## Reset to Fresh State

```bash
docker-compose down -v
docker rmi coldlinebrasil-backend-server
docker-compose up --build -d
```

## Test API

```bash
# Health check
curl http://localhost:8080/health

# Create contact
curl -X POST http://localhost:8080/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","phone":"0","message":"Hi"}'
```
