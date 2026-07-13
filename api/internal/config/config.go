package config

import "os"

type Config struct {
	DatabaseURL    string
	JWTSecret      string
	EncryptionKey  string
	Port           string
	AllowedOrigins []string

	SMTPHost   string
	SMTPPort   string
	SMTPUser   string
	SMTPPass   string
	EmailFrom  string
	AppBaseURL string
}

func Load() *Config {
	return &Config{
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://coldline:Coldline123@localhost:5432/coldlinedb?sslmode=disable"),
		JWTSecret:     getEnv("JWT_SECRET", "0ae1c7c01a714cd9b45134ac180ead05b3036572b97a4878a6ea571006c2e929"),
		EncryptionKey: getEnv("ENCRYPTION_KEY", "A6sT9vX!zK@jLqP$1mYdN7#pWx*C2Q4b"),
		Port:          getEnv("PORT", "4000"),

		// SMTP para envio de emails (recuperação de senha). Sem defaults com
		// segredo real - em produção essas variáveis são configuradas direto
		// no Easypanel, nunca commitadas no repo.
		SMTPHost:   getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:   getEnv("SMTP_PORT", "587"),
		SMTPUser:   getEnv("SMTP_USER", ""),
		SMTPPass:   getEnv("SMTP_PASS", ""),
		EmailFrom:  getEnv("EMAIL_FROM", ""),
		AppBaseURL: getEnv("APP_BASE_URL", "https://portal.coldline.com.br"),

		AllowedOrigins: []string{
			"https://portal.coldline.com.br",
			"http://portal.coldline.com.br",
			"https://www.portal.coldline.com.br",
			"http://localhost",
			"http://localhost:80",
			"http://localhost:5173",
			"http://localhost:3000",
			"http://localhost:4173",
		},
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
