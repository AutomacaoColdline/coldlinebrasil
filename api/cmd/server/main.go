package main

import (
	"context"
	"log"
	"strings"
	"time"

	"coldline-api/internal/config"
	dbpkg "coldline-api/internal/db"
	"coldline-api/internal/handlers"
	"coldline-api/internal/middleware"
	"coldline-api/internal/scheduler"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	cfg := config.Load()
	db := dbpkg.Connect(cfg.DatabaseURL)

	ctxRepair, cancelRepair := context.WithTimeout(context.Background(), 30*time.Second)
	if err := handlers.RepairStuckProcessOccurrenceState(ctxRepair, db); err != nil {
		log.Printf("[boot] repair estado pausa/ocorrência: %v", err)
	}
	cancelRepair()

	ctxSanitize, cancelSanitize := context.WithTimeout(context.Background(), 60*time.Second)
	if err := handlers.RepairHistoricalSystemOccurrenceTimes(ctxSanitize, db); err != nil {
		log.Printf("[boot] repair histórico de ocorrências do sistema: %v", err)
	}
	cancelSanitize()

	r := gin.Default()
	r.Static("/uploads", "./wwwroot/uploads")

	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowOriginFunc: func(origin string) bool {
			origin = strings.ToLower(origin)
			if strings.HasPrefix(origin, "http://localhost") || strings.HasPrefix(origin, "https://localhost") {
				return true
			}
			if strings.HasPrefix(origin, "http://127.0.0.1") || strings.HasPrefix(origin, "https://127.0.0.1") {
				return true
			}
			if strings.HasPrefix(origin, "http://10.0.0.44") || strings.HasPrefix(origin, "https://10.0.0.44") {
				return true
			}
			// Permite domínio principal e subdomínios do coldnex em http/https.
			if strings.HasPrefix(origin, "https://coldnex.com") || strings.HasPrefix(origin, "http://coldnex.com") {
				return true
			}
			if strings.HasPrefix(origin, "https://www.coldnex.com") || strings.HasPrefix(origin, "http://www.coldnex.com") {
				return true
			}
			if strings.HasPrefix(origin, "https://api.coldnex.com") || strings.HasPrefix(origin, "http://api.coldnex.com") {
				return true
			}
			return false
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	userHandler       := handlers.NewUserHandler(db, cfg.JWTSecret)
	processHandler    := handlers.NewProcessHandler(db)
	machineHandler    := handlers.NewMachineHandler(db)
	occurrenceHandler := handlers.NewOccurrenceHandler(db)
	dashboardHandler  := handlers.NewDashboardHandler(db)
	noteHandler       := handlers.NewNoteHandler(db)
	monitoringHandler    := handlers.NewMonitoringHandler(db)
	workOrderHandler     := handlers.NewWorkOrderHandler(db)
	clientHandler        := handlers.NewClientHandler(db)
	coldvisioGuideHandler := handlers.NewColdvisioGuideHandler(db)

	userTypeHandler       := handlers.NewCRUDHandler(db, "user_types")
	departmentHandler     := handlers.NewCRUDHandler(db, "departments")
	processTypeHandler    := handlers.NewCRUDHandler(db, "process_types")
	occurrenceTypeHandler := handlers.NewCRUDHandler(db, "occurrence_types")
	machineTypeHandler    := handlers.NewCRUDHandler(db, "machine_types")
	monitoringTypeHandler := handlers.NewCRUDHandler(db, "monitoring_types")

	auth := middleware.JWTMiddleware(cfg.JWTSecret)

	api := r.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok", "db": "postgres"})
		})

		api.GET("/debug/users", userHandler.ListIdentifications)
		api.GET("/dashboard", auth, dashboardHandler.GetDashboard)

		users := api.Group("/User")
		users.POST("/login", userHandler.Login)
		users.GET("/tv-identification/:id", userHandler.TVLogin)
		users.GET("/identification/:id", userHandler.GetByIdentification)

		usersAuth := api.Group("/User", auth)
		usersAuth.GET("", userHandler.GetAll)
		usersAuth.GET("/search", userHandler.Search)
		usersAuth.POST("/upload-image", userHandler.UploadImage)
		usersAuth.GET("/:id", userHandler.GetByID)
		usersAuth.POST("", userHandler.Create)
		usersAuth.PUT("/:id", userHandler.Update)
		usersAuth.DELETE("/:id", userHandler.Delete)

		proc := api.Group("/Process", auth)
		proc.GET("", processHandler.GetAll)
		proc.GET("/stats", processHandler.GetStats)
		proc.GET("/search", processHandler.Search)
		proc.GET("/:id", processHandler.GetByID)
		proc.POST("", processHandler.Create)
		proc.PUT("/:id", processHandler.Update)
		proc.DELETE("/:id", processHandler.Delete)
		proc.POST("/start", processHandler.StartProcess)
		proc.POST("/end/:id", processHandler.EndProcess)
		proc.PATCH("/:id/history-time", processHandler.UpdateHistoryTime)
		proc.POST("/:id/pause", processHandler.PauseProcess)
		proc.POST("/:id/resume", processHandler.ResumeProcess)
		proc.GET("/type-stats/:processTypeId", processHandler.GetProcessTypeStats)
		proc.GET("/monthly-summary/:userId/:year/:month", processHandler.MonthlySummary)
		proc.GET("/user-stats/:userId", processHandler.GetUserStats)
		proc.GET("/reports/machines/cycle", processHandler.MachineCycleReport)
		proc.GET("/reports/machines/total-hours", processHandler.MachineTotalHoursReport)
		proc.GET("/reports/machines/period", processHandler.MachinePeriodReport)

		mach := api.Group("/Machine", auth)
		mach.GET("", machineHandler.GetAll)
		mach.GET("/stats", machineHandler.GetStats)
		mach.GET("/dashboard", machineHandler.Dashboard)
		mach.GET("/search", machineHandler.Search)
		mach.GET("/:id", machineHandler.GetByID)
		mach.GET("/:id/detail", machineHandler.GetDetail)
		mach.POST("", machineHandler.Create)
		mach.PUT("/:id", machineHandler.Update)
		mach.DELETE("/:id", machineHandler.Delete)

		occ := api.Group("/Occurrence", auth)
		occ.GET("", occurrenceHandler.GetAll)
		occ.GET("/stats", occurrenceHandler.GetStats)
		occ.GET("/search", occurrenceHandler.Search)
		occ.GET("/:id", occurrenceHandler.GetByID)
		occ.POST("", occurrenceHandler.Create)
		occ.PUT("/:id", occurrenceHandler.Update)
		occ.DELETE("/:id", occurrenceHandler.Delete)
		occ.POST("/finalize/:id", occurrenceHandler.Finalize)

		notes := api.Group("/Note", auth)
		notes.GET("", noteHandler.GetAll)
		notes.GET("/search", noteHandler.Search)
		notes.GET("/:id", noteHandler.GetByID)
		notes.POST("", noteHandler.Create)
		notes.PUT("/:id", noteHandler.Update)
		notes.DELETE("/:id", noteHandler.Delete)

		mon := api.Group("/Monitoring", auth)
		mon.GET("", monitoringHandler.GetAll)
		mon.GET("/search", monitoringHandler.Search)
		mon.GET("/types", monitoringHandler.GetTypes)
		mon.GET("/:id", monitoringHandler.GetByID)
		mon.POST("", monitoringHandler.Create)
		mon.PUT("/:id", monitoringHandler.Update)
		mon.DELETE("/:id", monitoringHandler.Delete)

		wo := api.Group("/WorkOrder", auth)
		wo.GET("", workOrderHandler.GetAll)
		wo.GET("/search", workOrderHandler.Search)
		wo.GET("/:id", workOrderHandler.GetByID)
		wo.POST("", workOrderHandler.Create)
		wo.PUT("/:id", workOrderHandler.Update)
		wo.DELETE("/:id", workOrderHandler.Delete)
		wo.POST("/:id/assign", workOrderHandler.AssignTechnician)
		wo.DELETE("/:id/technician/:techId", workOrderHandler.RemoveTechnician)
		wo.PATCH("/:id/status", workOrderHandler.UpdateStatus)
		wo.POST("/:id/checkin", workOrderHandler.CheckIn)
		wo.POST("/:id/checkout", workOrderHandler.CheckOut)
		wo.PATCH("/:id/report", workOrderHandler.UpdateReport)
		wo.POST("/:id/images", workOrderHandler.UploadImage)
		wo.DELETE("/:id/images/:imageId", workOrderHandler.DeleteImage)
		wo.PATCH("/:id/images/:imageId/annotation", workOrderHandler.UpdateImageAnnotation)

		cli := api.Group("/Client", auth)
		cli.GET("", clientHandler.GetAll)
		cli.GET("/search", clientHandler.Search)
		cli.GET("/cnpj/:cnpj", clientHandler.LookupCNPJ)
		cli.GET("/:id", clientHandler.GetByID)
		cli.POST("", clientHandler.Create)
		cli.PUT("/:id", clientHandler.Update)
		cli.DELETE("/:id", clientHandler.Delete)

		registerCRUD(api, "/UserType", userTypeHandler, auth)
		registerCRUD(api, "/Department", departmentHandler, auth)
		registerCRUD(api, "/ProcessType", processTypeHandler, auth)
		registerCRUD(api, "/OccurrenceType", occurrenceTypeHandler, auth)
		registerCRUD(api, "/MachineType", machineTypeHandler, auth)
		registerCRUD(api, "/MonitoringType", monitoringTypeHandler, auth)

		cvGuide := api.Group("/ColdvisioGuide", auth)
		cvGuide.GET("", coldvisioGuideHandler.GetAll)
		cvGuide.PUT("", coldvisioGuideHandler.Save)
	}

	scheduler.Start(db)

	log.Printf("🚀 Servidor rodando na porta %s", cfg.Port)
	r.Run(":" + cfg.Port)
}

func registerCRUD(group *gin.RouterGroup, path string, h *handlers.CRUDHandler, auth gin.HandlerFunc) {
	g := group.Group(path, auth)
	g.GET("", h.GetAll)
	g.GET("/:id", h.GetByID)
	g.POST("", h.Create)
	g.PUT("/:id", h.Update)
	g.DELETE("/:id", h.Delete)
}
