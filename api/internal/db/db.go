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
	)
	if err != nil {
		return err
	}

	for _, t := range []string{"user_types", "departments", "process_types", "occurrence_types", "machine_types", "monitoring_types"} {
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
	}
	for _, stmt := range stmts {
		if err := db.Exec(stmt).Error; err != nil {
			return err
		}
	}
	return nil
}
