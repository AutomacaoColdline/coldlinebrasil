package db

import (
	"log"

	"coldline-api/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(dsn string) *gorm.DB {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("Erro ao conectar ao PostgreSQL: %v", err)
	}

	if err := migrate(db); err != nil {
		log.Fatalf("Erro ao migrar banco de dados: %v", err)
	}
	if err := ensureIndexes(db); err != nil {
		log.Fatalf("Erro ao criar índices do banco: %v", err)
	}

	seed(db)
	log.Println("✅ PostgreSQL conectado e migrado")
	return db
}

func migrate(db *gorm.DB) error {
	err := db.AutoMigrate(
		&models.User{},
		&models.Machine{},
		&models.Process{},
		&models.Occurrence{},
		&models.Note{},
		&models.Monitoring{},
		&models.WorkOrder{},
		&models.Client{},
		&models.ClientSurvey{},
		&models.InformationDemand{},
		&models.InformationApproval{},
		&models.InformationTraining{},
		&models.InformationProcess{},
		&models.InformationDailyRoutine{},
		&models.InformationMeeting{},
		&models.InformationDepartmentSupport{},
		&models.InformationChecklistTemplate{},
		&models.InformationDailyChecklist{},
		&models.InformationOrgChart{},
		&models.InformationPosition{},
		&models.InformationOrgDepartment{},
		&models.ColdvisioGuideStep{},
		&models.ColdvisioUpdateEntry{},
		&models.ColdvisioUpdateFile{},
		&models.Atendimento{},
		&models.AtendimentoChecklistTemplate{},
		&models.Part{},
		&models.ProductionModel{},
		&models.ProductionBomItem{},
		&models.ProductionClientBuild{},
	)
	if err != nil {
		return err
	}

	for _, t := range []string{"user_types", "departments", "process_types", "occurrence_types", "machine_types", "monitoring_types", "requisition_emails"} {
		if err := db.Table(t).AutoMigrate(&models.BaseEntity{}); err != nil {
			return err
		}
	}
	return nil
}

func ensureIndexes(db *gorm.DB) error {
	stmts := []string{
		// Processos: filtros por máquina/período e integridade de processo ativo por usuário.
		`CREATE INDEX IF NOT EXISTS idx_processes_machine_ref_id ON processes ((machine_ref->>'id'))`,
		`CREATE INDEX IF NOT EXISTS idx_processes_start_date ON processes (start_date)`,
		`CREATE INDEX IF NOT EXISTS idx_processes_end_date ON processes (end_date)`,
		`CREATE INDEX IF NOT EXISTS idx_processes_user_active_lookup ON processes ((user_ref->>'id'), finished, in_occurrence)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS uq_process_active_user ON processes ((user_ref->>'id')) WHERE finished = false AND in_occurrence = false`,
		// Ocorrências: filtros por máquina/processo/período.
		`CREATE INDEX IF NOT EXISTS idx_occurrences_machine_ref_id ON occurrences ((machine_ref->>'id'))`,
		`CREATE INDEX IF NOT EXISTS idx_occurrences_process_ref_id ON occurrences ((process_ref->>'id'))`,
		`CREATE INDEX IF NOT EXISTS idx_occurrences_start_date ON occurrences (start_date)`,
		`CREATE INDEX IF NOT EXISTS idx_occurrences_end_date ON occurrences (end_date)`,
		`CREATE INDEX IF NOT EXISTS idx_information_demands_created_date ON information_demands (created_date)`,
		`CREATE INDEX IF NOT EXISTS idx_information_demands_status ON information_demands (status)`,
		`CREATE INDEX IF NOT EXISTS idx_information_approvals_date ON information_approvals (date)`,
		`CREATE INDEX IF NOT EXISTS idx_information_trainings_date ON information_trainings (date)`,
		`CREATE INDEX IF NOT EXISTS idx_information_processes_date ON information_processes (date)`,
		`CREATE INDEX IF NOT EXISTS idx_information_daily_routines_date ON information_daily_routines (date)`,
		`CREATE INDEX IF NOT EXISTS idx_information_meetings_date ON information_meetings (date)`,
		`CREATE INDEX IF NOT EXISTS idx_information_support_date ON information_department_support (date)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS uq_information_checklist_week_item ON information_daily_checklist (template_id, week_start)`,
		`CREATE INDEX IF NOT EXISTS idx_atendimentos_open_date ON atendimentos (open_date)`,
		`CREATE INDEX IF NOT EXISTS idx_atendimentos_close_date ON atendimentos (close_date)`,
		`CREATE INDEX IF NOT EXISTS idx_atendimentos_status ON atendimentos (status)`,
		`CREATE INDEX IF NOT EXISTS idx_atendimentos_priority ON atendimentos (priority)`,
		`CREATE INDEX IF NOT EXISTS idx_atendimentos_client_ref_id ON atendimentos ((client_ref->>'id'))`,
		`CREATE INDEX IF NOT EXISTS idx_atendimentos_technician_ref_id ON atendimentos ((technician_ref->>'id'))`,
		`CREATE INDEX IF NOT EXISTS idx_atendimentos_number ON atendimentos (number)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS uq_production_models_slug ON production_models (slug)`,
		`CREATE INDEX IF NOT EXISTS idx_production_bom_items_model ON production_bom_items (production_model_id, variant)`,
		`CREATE INDEX IF NOT EXISTS idx_production_bom_items_build ON production_bom_items (client_build_id)`,
		`CREATE INDEX IF NOT EXISTS idx_production_client_builds_model ON production_client_builds (production_model_id)`,
		`CREATE INDEX IF NOT EXISTS idx_production_client_builds_serial_number ON production_client_builds (serial_number)`,
	}
	for _, stmt := range stmts {
		if err := db.Exec(stmt).Error; err != nil {
			return err
		}
	}
	return nil
}
