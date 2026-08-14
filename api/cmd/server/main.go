package main

import (
	"context"
	"log"
	"strings"
	"time"

	"coldline-api/internal/authz"
	"coldline-api/internal/config"
	dbpkg "coldline-api/internal/db"
	"coldline-api/internal/email"
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
		AllowOrigins: cfg.AllowedOrigins,
		AllowOriginFunc: func(origin string) bool {
			origin = strings.ToLower(origin)
			if strings.HasPrefix(origin, "http://localhost") || strings.HasPrefix(origin, "https://localhost") {
				return true
			}
			if strings.HasPrefix(origin, "http://127.0.0.1") || strings.HasPrefix(origin, "https://127.0.0.1") {
				return true
			}
			// Permite domínio principal e subdomínios do portal.coldline.com.br em http/https.
			if strings.HasPrefix(origin, "https://portal.coldline.com.br") || strings.HasPrefix(origin, "http://portal.coldline.com.br") {
				return true
			}
			if strings.HasPrefix(origin, "https://www.portal.coldline.com.br") || strings.HasPrefix(origin, "http://www.portal.coldline.com.br") {
				return true
			}
			return false
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	emailCfg := email.Config{
		Host: cfg.SMTPHost,
		Port: cfg.SMTPPort,
		User: cfg.SMTPUser,
		Pass: cfg.SMTPPass,
		From: cfg.EmailFrom,
	}
	userHandler := handlers.NewUserHandler(db, cfg.JWTSecret, emailCfg, cfg.AppBaseURL)
	processHandler := handlers.NewProcessHandler(db, emailCfg)
	machineHandler := handlers.NewMachineHandler(db)
	occurrenceHandler := handlers.NewOccurrenceHandler(db, emailCfg)
	dashboardHandler := handlers.NewDashboardHandler(db)
	noteHandler := handlers.NewNoteHandler(db)
	monitoringHandler := handlers.NewMonitoringHandler(db)
	workOrderHandler := handlers.NewWorkOrderHandler(db)
	clientHandler := handlers.NewClientHandler(db)
	coldvisioGuideHandler := handlers.NewColdvisioGuideHandler(db)
	informationHandler := handlers.NewInformationHandler(db)
	atendimentoHandler := handlers.NewAtendimentoHandler(db)
	partHandler := handlers.NewPartHandler(db)
	productionHandler := handlers.NewProductionHandler(db)
	requisitionEmailHandler := handlers.NewRequisitionEmailHandler(db)

	userTypeHandler := handlers.NewCRUDHandler(db, "user_types")
	departmentHandler := handlers.NewCRUDHandler(db, "departments")
	processTypeHandler := handlers.NewCRUDHandler(db, "process_types")
	occurrenceTypeHandler := handlers.NewCRUDHandler(db, "occurrence_types")
	machineTypeHandler := handlers.NewCRUDHandler(db, "machine_types")
	monitoringTypeHandler := handlers.NewCRUDHandler(db, "monitoring_types")

	auth := middleware.JWTMiddleware(cfg.JWTSecret)
	industriaAccess := middleware.RequireService(db, authz.ServiceIndustria)
	automationAccess := middleware.RequireService(db, authz.ServiceAutomation)
	departamentoAccess := middleware.RequireService(db, authz.ServiceDepartamento)
	superAdminOnly := middleware.RequireSuperAdmin(db)

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
		users.POST("/forgot-password", userHandler.ForgotPassword)
		users.POST("/reset-password", userHandler.ResetPassword)

		usersAuth := api.Group("/User", auth)
		usersAuth.GET("", userHandler.GetAll)
		usersAuth.GET("/search", userHandler.Search)
		usersAuth.POST("/upload-image", userHandler.UploadImage)
		usersAuth.POST("/change-password", userHandler.ChangePassword)
		usersAuth.GET("/:id", userHandler.GetByID)
		usersAuth.POST("", userHandler.Create)
		usersAuth.PUT("/:id", userHandler.Update)
		usersAuth.DELETE("/:id", userHandler.Delete)
		usersAuth.PUT("/:id/services", superAdminOnly, userHandler.UpdateServices)
		usersAuth.PUT("/:id/password", superAdminOnly, userHandler.AdminSetPassword)

		proc := api.Group("/Process", auth, industriaAccess)
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

		mach := api.Group("/Machine", auth, industriaAccess)
		mach.GET("", machineHandler.GetAll)
		mach.GET("/stats", machineHandler.GetStats)
		mach.GET("/dashboard", machineHandler.Dashboard)
		mach.GET("/search", machineHandler.Search)
		mach.GET("/:id", machineHandler.GetByID)
		mach.GET("/:id/detail", machineHandler.GetDetail)
		mach.POST("", machineHandler.Create)
		mach.PUT("/:id", machineHandler.Update)
		mach.DELETE("/:id", machineHandler.Delete)
		mach.POST("/:id/finish", machineHandler.FinishMachine)

		parts := api.Group("/Part", auth, industriaAccess)
		parts.GET("", partHandler.GetAll)
		parts.GET("/search", partHandler.Search)
		parts.POST("", partHandler.Create)
		parts.PUT("/:id", partHandler.Update)
		parts.DELETE("/:id", partHandler.Delete)

		reqEmails := api.Group("/RequisitionEmail", auth, industriaAccess)
		reqEmails.GET("", requisitionEmailHandler.GetAll)
		reqEmails.POST("", requisitionEmailHandler.Create)
		reqEmails.PUT("/:id", requisitionEmailHandler.Update)
		reqEmails.DELETE("/:id", requisitionEmailHandler.Delete)

		occ := api.Group("/Occurrence", auth, industriaAccess)
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

		mon := api.Group("/Monitoring", auth, automationAccess)
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
		registerCRUD(api, "/ProcessType", processTypeHandler, auth, industriaAccess)
		registerCRUD(api, "/OccurrenceType", occurrenceTypeHandler, auth, industriaAccess)
		registerCRUD(api, "/MachineType", machineTypeHandler, auth, industriaAccess)
		registerCRUD(api, "/MonitoringType", monitoringTypeHandler, auth, automationAccess)

		cvGuide := api.Group("/ColdvisioGuide", auth, automationAccess)
		cvGuide.GET("", coldvisioGuideHandler.GetAll)
		cvGuide.PUT("", coldvisioGuideHandler.Save)
		cvGuide.GET("/updates", coldvisioGuideHandler.ListUpdates)
		cvGuide.POST("/updates", coldvisioGuideHandler.CreateUpdate)
		cvGuide.GET("/updates/:id/download", coldvisioGuideHandler.DownloadUpdate)
		cvGuide.GET("/updates/:id/files/:fileId/download", coldvisioGuideHandler.DownloadUpdateFile)
		cvGuide.DELETE("/updates/:id", coldvisioGuideHandler.DeleteUpdate)

		info := api.Group("/departamento-informacao", auth, departamentoAccess)
		info.GET("/dashboard", informationHandler.GetDashboard)
		info.GET("/demands", informationHandler.GetDemands)
		info.GET("/demands/:id", informationHandler.GetDemandByID)
		info.POST("/demands", informationHandler.CreateDemand)
		info.PUT("/demands/:id", informationHandler.UpdateDemand)
		info.DELETE("/demands/:id", informationHandler.DeleteDemand)
		info.POST("/attachments/upload", informationHandler.UploadAttachment)
		info.GET("/approvals", informationHandler.GetApprovals)
		info.GET("/approvals/:id", informationHandler.GetApprovalByID)
		info.POST("/approvals", informationHandler.CreateApproval)
		info.PUT("/approvals/:id", informationHandler.UpdateApproval)
		info.DELETE("/approvals/:id", informationHandler.DeleteApproval)
		info.GET("/trainings", informationHandler.GetTrainings)
		info.GET("/trainings/:id", informationHandler.GetTrainingByID)
		info.POST("/trainings", informationHandler.CreateTraining)
		info.PUT("/trainings/:id", informationHandler.UpdateTraining)
		info.DELETE("/trainings/:id", informationHandler.DeleteTraining)
		info.GET("/processes", informationHandler.GetInformationProcesses)
		info.GET("/processes/:id", informationHandler.GetInformationProcessByID)
		info.POST("/processes", informationHandler.CreateInformationProcess)
		info.PUT("/processes/:id", informationHandler.UpdateInformationProcess)
		info.DELETE("/processes/:id", informationHandler.DeleteInformationProcess)
		info.GET("/daily-routines", informationHandler.GetDailyRoutines)
		info.GET("/daily-routines/:id", informationHandler.GetDailyRoutineByID)
		info.POST("/daily-routines", informationHandler.CreateDailyRoutine)
		info.PUT("/daily-routines/:id", informationHandler.UpdateDailyRoutine)
		info.DELETE("/daily-routines/:id", informationHandler.DeleteDailyRoutine)
		info.GET("/meetings", informationHandler.GetMeetings)
		info.GET("/meetings/:id", informationHandler.GetMeetingByID)
		info.POST("/meetings", informationHandler.CreateMeeting)
		info.PUT("/meetings/:id", informationHandler.UpdateMeeting)
		info.DELETE("/meetings/:id", informationHandler.DeleteMeeting)
		info.GET("/department-support", informationHandler.GetDepartmentSupport)
		info.GET("/department-support/:id", informationHandler.GetDepartmentSupportByID)
		info.POST("/department-support", informationHandler.CreateDepartmentSupport)
		info.PUT("/department-support/:id", informationHandler.UpdateDepartmentSupport)
		info.DELETE("/department-support/:id", informationHandler.DeleteDepartmentSupport)
		info.GET("/checklist", informationHandler.GetChecklist)
		info.POST("/checklist/items", informationHandler.CreateChecklistTemplate)
		info.PUT("/checklist/items/:id", informationHandler.UpdateChecklistTemplate)
		info.DELETE("/checklist/items/:id", informationHandler.DeleteChecklistTemplate)
		info.PUT("/checklist/entries/:id", informationHandler.UpdateChecklistEntry)
		info.GET("/positions", informationHandler.GetPositions)
		info.GET("/positions/:id", informationHandler.GetPositionByID)
		info.POST("/positions", informationHandler.CreatePosition)
		info.PUT("/positions/:id", informationHandler.UpdatePosition)
		info.DELETE("/positions/:id", informationHandler.DeletePosition)
		info.POST("/positions/reorder", informationHandler.ReorderPositions)
		info.GET("/org-departments", informationHandler.GetOrgDepartments)
		info.GET("/org-departments/:id", informationHandler.GetOrgDepartmentByID)
		info.POST("/org-departments", informationHandler.CreateOrgDepartment)
		info.PUT("/org-departments/:id", informationHandler.UpdateOrgDepartment)
		info.DELETE("/org-departments/:id", informationHandler.DeleteOrgDepartment)
		info.POST("/org-departments/reorder", informationHandler.ReorderOrgDepartments)
		info.GET("/org-charts", informationHandler.GetOrgCharts)
		info.GET("/org-charts/:id", informationHandler.GetOrgChartByID)
		info.POST("/org-charts", informationHandler.CreateOrgChart)
		info.PUT("/org-charts/:id", informationHandler.UpdateOrgChart)
		info.DELETE("/org-charts/:id", informationHandler.DeleteOrgChart)

		prod := api.Group("/departamento-informacao/producao", auth, departamentoAccess)
		prod.GET("/models", productionHandler.GetModels)
		prod.GET("/models/:modelId", productionHandler.GetModelByID)
		prod.GET("/models/:modelId/bom", productionHandler.GetModelBom)
		prod.POST("/models/:modelId/bom", productionHandler.CreateModelBomItem)
		prod.GET("/models/:modelId/bom/export", productionHandler.ExportModelBom)
		prod.POST("/models/:modelId/bom/import", productionHandler.ImportModelBom)
		prod.GET("/models/:modelId/builds", productionHandler.GetBuilds)
		prod.POST("/models/:modelId/builds", productionHandler.CreateBuild)
		prod.GET("/builds/:buildId", productionHandler.GetBuildByID)
		prod.PUT("/builds/:buildId", productionHandler.UpdateBuild)
		prod.DELETE("/builds/:buildId", productionHandler.DeleteBuild)
		prod.GET("/builds/:buildId/bom", productionHandler.GetBuildBom)
		prod.POST("/builds/:buildId/bom", productionHandler.CreateBuildBomItem)
		prod.GET("/builds/:buildId/bom/export", productionHandler.ExportBuildBom)
		prod.POST("/builds/:buildId/bom/import", productionHandler.ImportBuildBom)
		prod.PUT("/bom/:id", productionHandler.UpdateBomItem)
		prod.DELETE("/bom/:id", productionHandler.DeleteBomItem)
		prod.GET("/dashboard", productionHandler.GetDashboard)
		prod.GET("/parts/search", productionHandler.SearchParts)
		prod.POST("/parts", productionHandler.CreatePart)
		prod.PUT("/parts/:id", productionHandler.UpdatePart)

		atd := api.Group("/Atendimento", auth, automationAccess)
		atd.GET("", atendimentoHandler.GetAll)
		atd.GET("/search", atendimentoHandler.Search)
		atd.GET("/dashboard", atendimentoHandler.Dashboard)
		atd.GET("/knowledge-base", atendimentoHandler.ListKnowledgeBase)
		atd.GET("/checklist-templates", atendimentoHandler.ListChecklistTemplates)
		atd.POST("/checklist-templates", atendimentoHandler.CreateChecklistTemplate)
		atd.PUT("/checklist-templates/:id", atendimentoHandler.UpdateChecklistTemplate)
		atd.DELETE("/checklist-templates/:id", atendimentoHandler.DeleteChecklistTemplate)
		atd.GET("/tags", atendimentoHandler.ListAvailableTags)
		atd.GET("/client/:clientId", atendimentoHandler.ClientHistory)
		atd.GET("/equipment-history", atendimentoHandler.EquipmentHistory)
		atd.GET("/report/general", atendimentoHandler.ReportGeneral)
		atd.GET("/report/client/:clientId", atendimentoHandler.ReportByClient)
		atd.GET("/:id", atendimentoHandler.GetByID)
		atd.POST("", atendimentoHandler.Create)
		atd.PUT("/:id", atendimentoHandler.Update)
		atd.DELETE("/:id", atendimentoHandler.Delete)
		atd.PATCH("/:id/status", atendimentoHandler.UpdateStatus)
		atd.POST("/:id/assign", atendimentoHandler.AssignTechnician)
		atd.PATCH("/:id/diagnosis", atendimentoHandler.UpdateDiagnosis)
		atd.PATCH("/:id/tags", atendimentoHandler.UpdateTags)
		atd.POST("/:id/files", atendimentoHandler.UploadFile)
		atd.DELETE("/:id/files/:fileId", atendimentoHandler.DeleteFile)
		atd.POST("/:id/time-logs/start", atendimentoHandler.StartTimeLog)
		atd.POST("/:id/time-logs/stop", atendimentoHandler.StopTimeLog)
		atd.POST("/:id/sign", atendimentoHandler.Sign)
		atd.POST("/:id/observation", atendimentoHandler.AddObservation)
		atd.POST("/:id/knowledge-base", atendimentoHandler.PublishToKnowledgeBase)
		atd.DELETE("/:id/knowledge-base", atendimentoHandler.UnpublishFromKnowledgeBase)
		atd.POST("/:id/checklist/apply", atendimentoHandler.ApplyChecklistTemplate)
		atd.PATCH("/:id/checklist/items", atendimentoHandler.UpdateChecklistItem)
	}

	scheduler.Start(db)

	log.Printf("🚀 Servidor rodando na porta %s", cfg.Port)
	r.Run(":" + cfg.Port)
}

func registerCRUD(group *gin.RouterGroup, path string, h *handlers.CRUDHandler, middlewares ...gin.HandlerFunc) {
	g := group.Group(path, middlewares...)
	g.GET("", h.GetAll)
	g.GET("/:id", h.GetByID)
	g.POST("", h.Create)
	g.PUT("/:id", h.Update)
	g.DELETE("/:id", h.Delete)
}
