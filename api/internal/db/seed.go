package db

import (
	"encoding/json"
	"log"

	"coldline-api/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func seed(db *gorm.DB) {
	seedConfigTable(db, "user_types", []string{
		"Administrador", "Técnico", "Operador", "Supervisor", "Visitante",
	})
	seedConfigTable(db, "departments", []string{
		"TI", "Manutenção", "Operação", "Engenharia", "Administrativo",
	})
	seedConfigTable(db, "process_types", []string{
		"Manutenção Preventiva", "Manutenção Corretiva", "Instalação", "Inspeção", "Calibração",
	})
	seedConfigTable(db, "occurrence_types", []string{
		"Falha Elétrica", "Falha Mecânica", "Falha de Software", "Acidente", "Parada Não Planejada",
	})
	seedConfigTable(db, "machine_types", []string{
		"Compressor", "Bomba", "Motor", "Gerador", "Painel Elétrico", "CLP", "IHM",
	})
	seedConfigTable(db, "monitoring_types", []string{
		"XWEB", "SITRAD", "COLDVISIO",
	})

	seedAdminUser(db)
}

func seedConfigTable(db *gorm.DB, table string, names []string) {
	var count int64
	db.Table(table).Count(&count)
	if count > 0 {
		return
	}

	for _, name := range names {
		row := models.BaseEntity{Name: name}
		db.Table(table).Create(&row)
	}
	log.Printf("🌱 Tabela '%s' populada com %d registros", table, len(names))
}

func seedAdminUser(db *gorm.DB) {
	var count int64
	db.Table("users").Where("email = ?", "admin@coldline.com.br").Count(&count)
	if count > 0 {
		return
	}

	var adminType models.BaseEntity
	db.Table("user_types").Where("name = ?", "Administrador").First(&adminType)

	var dept models.BaseEntity
	db.Table("departments").Where("name = ?", "TI").First(&dept)

	hashed, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("❌ Erro ao gerar senha do admin: %v", err)
		return
	}

	userTypeJSON, _ := json.Marshal(models.ReferenceEntity{ID: adminType.ID, Name: adminType.Name})
	deptJSON, _ := json.Marshal(models.ReferenceEntity{ID: dept.ID, Name: dept.Name})

	admin := map[string]interface{}{
		"name":                  "Administrador",
		"email":                 "admin@coldline.com.br",
		"password":              string(hashed),
		"identification_number": "0001",
		"user_type":             string(userTypeJSON),
		"department":            string(deptJSON),
		"work_hour_cost":        "0",
	}

	db.Table("users").Create(&admin)
	log.Println("🌱 Usuário admin criado: admin@coldline.com.br / admin123")
}
