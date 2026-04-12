package config

import (
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL   string
	Port          string
	Env           string
	JWTSecret     string
	JWTExpiration time.Duration
	CORSOrigins   string
}

func Load() (*Config, error) {
	godotenv.Load()

	expiration, err := time.ParseDuration(os.Getenv("JWT_EXPIRATION"))
	if err != nil {
		expiration = 24 * time.Hour
	}

	cfg := &Config{
		DatabaseURL:   os.Getenv("DATABASE_URL"),
		Port:          os.Getenv("PORT"),
		Env:           os.Getenv("ENV"),
		JWTSecret:     os.Getenv("JWT_SECRET"),
		JWTExpiration: expiration,
		CORSOrigins:   os.Getenv("CORS_ORIGINS"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL não definida")
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET não definida")
	}

	return cfg, nil
}
