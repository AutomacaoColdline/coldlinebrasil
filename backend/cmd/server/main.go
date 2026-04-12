package main

import (
	"fmt"
	"log"

	"coldlinebrasil/internal/auth"
	"coldlinebrasil/internal/config"
	"coldlinebrasil/internal/db"
	"coldlinebrasil/internal/handlers"
	"github.com/gin-gonic/gin"
)

var authMiddleware = auth.AuthMiddleware
var adminMiddleware = auth.AdminMiddleware

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("erro ao carregar config: %v", err)
	}

	database, err := db.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("erro ao conectar ao banco de dados: %v", err)
	}
	defer database.Close()

	if err := database.Migrate(); err != nil {
		log.Fatalf("erro ao executar migrations: %v", err)
	}

	gin.SetMode(gin.DebugMode)
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	// CORS
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", cfg.CORSOrigins)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Auth routes
	authH := handlers.NewAuthHandler(database, cfg)
	auth := router.Group("/api/auth")
	{
		auth.POST("/signup", authH.Signup)
		auth.POST("/login", authH.Login)
	}

	// Service routes
	serviceH := handlers.NewServiceHandler(database)
	services := router.Group("/api/services")
	{
		services.GET("", serviceH.GetAll)
		services.GET("/:id", serviceH.GetByID)

		// Rotas protegidas por admin
		protected := services.Group("")
		protected.Use(authMiddleware(cfg), adminMiddleware())
		{
			protected.POST("", serviceH.Create)
			protected.PUT("/:id", serviceH.Update)
			protected.DELETE("/:id", serviceH.Delete)
		}
	}

	// Contact routes
	contactH := handlers.NewContactHandler(database)
	contacts := router.Group("/api/contacts")
	{
		contacts.POST("", contactH.CreateContact)

		// Apenas admin pode ver contatos
		protected := contacts.Group("")
		protected.Use(authMiddleware(cfg), adminMiddleware())
		{
			protected.GET("", contactH.GetAll)
		}
	}

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("🚀 Servidor rodando em http://localhost:%s", cfg.Port)
	if err := router.Run(addr); err != nil {
		log.Fatalf("erro ao iniciar servidor: %v", err)
	}
}
