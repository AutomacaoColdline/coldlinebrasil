package db

import (
	"encoding/json"
	"log"
	"strings"

	"coldline-api/internal/authz"
	"coldline-api/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func seed(db *gorm.DB) {
	seedConfigTable(db, "user_types", []string{
		"Administrador", "Técnico", "Operador", "Supervisor", "Visitante",
	})
	seedConfigTable(db, "departments", []string{
		"TI", "Manutenção", "Operação", "Engenharia", "Administrativo", "Automação",
	})
	seedConfigTable(db, "process_types", models.StageOrder)
	seedConfigTable(db, "occurrence_types", []string{
		models.PauseReasonFaltaDePeca, models.PauseReasonEmergencia,
	})
	migrateIndustriaStageTypes(db)
	seedConfigTable(db, "machine_types", []string{
		"Compressor", "Bomba", "Motor", "Gerador", "Painel Elétrico", "CLP", "IHM",
	})
	seedConfigTable(db, "monitoring_types", []string{
		"XWEB", "SITRAD", "COLDVISIO",
	})

	seedAdminUser(db)
	seedMasterAdmin(db)
	demoteLegacyAdmin(db)
	ensureMasterAdminCredentials(db)
	seedIndustriaUser(db)
	seedTVSystemUser(db)
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

// migrateIndustriaStageTypes substitui os antigos process_types/occurrence_types
// genéricos (de manutenção) pelos 5 processos reais de fabricação e pelos 2
// motivos de pausa (Falta de Peça / Emergência). Roda em todo boot, idempotente:
// só insere o que falta e só remove as linhas com os nomes legados exatos —
// nunca mexe em registros já customizados pelo usuário nem no tipo de pausa
// automática do sistema ("Sistema - Fora do Expediente").
func migrateIndustriaStageTypes(db *gorm.DB) {
	for _, name := range models.StageOrder {
		findOrCreateBaseEntity(db, "process_types", name)
	}
	for _, name := range []string{models.PauseReasonFaltaDePeca, models.PauseReasonEmergencia} {
		findOrCreateBaseEntity(db, "occurrence_types", name)
	}
	if res := db.Table("process_types").Where("name IN ?", models.LegacyProcessTypeNames).Delete(&models.BaseEntity{}); res.RowsAffected > 0 {
		log.Printf("🌱 process_types: %d tipo(s) legado(s) de manutenção removido(s)", res.RowsAffected)
	}
	if res := db.Table("occurrence_types").Where("name IN ?", models.LegacyOccurrenceTypeNames).Delete(&models.BaseEntity{}); res.RowsAffected > 0 {
		log.Printf("🌱 occurrence_types: %d motivo(s) legado(s) removido(s)", res.RowsAffected)
	}
}

func findOrCreateBaseEntity(db *gorm.DB, table, name string) models.BaseEntity {
	var entity models.BaseEntity
	db.Table(table).Where("name = ?", name).First(&entity)
	if entity.ID == "" {
		entity = models.BaseEntity{Name: name}
		db.Table(table).Create(&entity)
	}
	return entity
}

// seedMasterAdmin creates the "admin automação" (identification 7777), the
// only user allowed to manage per-user service access. Runs once, keyed by
// e-mail, so it's safe on both fresh installs and the already-live database.
func seedMasterAdmin(db *gorm.DB) {
	const email = "automacao@coldline.com.br"

	var count int64
	db.Table("users").Where("email = ?", email).Count(&count)
	if count > 0 {
		return
	}

	adminType := findOrCreateBaseEntity(db, "user_types", "Administrador")
	dept := findOrCreateBaseEntity(db, "departments", "Automação")

	hashed, err := bcrypt.GenerateFromPassword([]byte("automacao123"), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("❌ Erro ao gerar senha do admin automação: %v", err)
		return
	}

	userTypeJSON, _ := json.Marshal(models.ReferenceEntity{ID: adminType.ID, Name: adminType.Name})
	deptJSON, _ := json.Marshal(models.ReferenceEntity{ID: dept.ID, Name: dept.Name})
	allowedJSON, _ := json.Marshal([]string{authz.ServiceIndustria, authz.ServiceAutomation, authz.ServiceDepartamento})

	master := map[string]interface{}{
		"name":                  "Administrador Automação",
		"email":                 email,
		"password":              string(hashed),
		"identification_number": authz.SuperAdminIdentification,
		"user_type":             string(userTypeJSON),
		"department":            string(deptJSON),
		"work_hour_cost":        "0",
		"allowed_services":      string(allowedJSON),
	}

	db.Table("users").Create(&master)
	log.Printf("🌱 Admin automação criado: identificação %s / %s", authz.SuperAdminIdentification, email)
}

// demoteLegacyAdmin reclassifies the original 0001 user (previously the sole
// admin) down to an industria-only account, now that 7777 is the admin
// master. Self-limiting: it only acts while 0001 is still typed as
// Administrador, so it's a no-op after the first successful run.
func demoteLegacyAdmin(db *gorm.DB) {
	var user models.User
	if err := db.Table("users").Where("identification_number = ?", "0001").First(&user).Error; err != nil {
		return
	}
	if user.UserType == nil || strings.ToLower(strings.TrimSpace(user.UserType.Name)) != "administrador" {
		return
	}

	industriaType := findOrCreateBaseEntity(db, "user_types", "Operador")
	industriaDept := findOrCreateBaseEntity(db, "departments", "Operação")

	userTypeJSON, _ := json.Marshal(models.ReferenceEntity{ID: industriaType.ID, Name: industriaType.Name})
	deptJSON, _ := json.Marshal(models.ReferenceEntity{ID: industriaDept.ID, Name: industriaDept.Name})
	allowedJSON, _ := json.Marshal([]string{authz.ServiceIndustria})

	db.Table("users").Where("id = ?", user.ID).Updates(map[string]interface{}{
		"user_type":        string(userTypeJSON),
		"department":       string(deptJSON),
		"allowed_services": string(allowedJSON),
	})
	log.Println("🌱 Usuário 0001 reclassificado: acesso restrito à Indústria")
}

// ensureMasterAdminCredentials keeps the admin master's password pinned to
// the fixed value chosen for this account, even on a database where
// seedMasterAdmin already ran once with the old placeholder password. Runs
// every boot but only rewrites the hash when it doesn't already match.
func ensureMasterAdminCredentials(db *gorm.DB) {
	const email = "automacao@coldline.com.br"
	const password = "Automacao2026@Admin"

	var user models.User
	if err := db.Table("users").Where("email = ?", email).First(&user).Error; err != nil {
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)) == nil {
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("❌ Erro ao gerar senha do admin master: %v", err)
		return
	}

	db.Table("users").Where("id = ?", user.ID).Updates(map[string]interface{}{
		"password":             string(hashed),
		"must_change_password": false,
	})
	log.Println("🌱 Credenciais do admin master atualizadas")
}

// seedIndustriaUser creates the industria@coldline.com.br account with
// access limited to the Indústria service. Fine-grained tuning of its
// department/type is expected to be done later via Controle de Acessos.
func seedIndustriaUser(db *gorm.DB) {
	const email = "industria@coldline.com.br"

	var count int64
	db.Table("users").Where("email = ?", email).Count(&count)
	if count > 0 {
		return
	}

	userType := findOrCreateBaseEntity(db, "user_types", "Operador")
	dept := findOrCreateBaseEntity(db, "departments", "Indústria")

	hashed, err := bcrypt.GenerateFromPassword([]byte(DefaultNewUserPasswordSeed), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("❌ Erro ao gerar senha do usuário indústria: %v", err)
		return
	}

	userTypeJSON, _ := json.Marshal(models.ReferenceEntity{ID: userType.ID, Name: userType.Name})
	deptJSON, _ := json.Marshal(models.ReferenceEntity{ID: dept.ID, Name: dept.Name})
	allowedJSON, _ := json.Marshal([]string{authz.ServiceIndustria})

	industriaUser := map[string]interface{}{
		"name":                  "Usuário Indústria",
		"email":                 email,
		"password":              string(hashed),
		"identification_number": "1001",
		"user_type":             string(userTypeJSON),
		"department":            string(deptJSON),
		"work_hour_cost":        "0",
		"allowed_services":      string(allowedJSON),
		"must_change_password":  true,
	}

	db.Table("users").Create(&industriaUser)
	log.Printf("🌱 Usuário indústria criado: %s / senha inicial %s", email, DefaultNewUserPasswordSeed)
}

// TVSystemIdentification is the badge number of the headless account used by
// the TV/kiosk dashboard to authenticate silently, without any login screen.
const TVSystemIdentification = "9999"

// DefaultNewUserPasswordSeed mirrors handlers.DefaultNewUserPassword - kept
// as a separate constant here since db must not import handlers.
const DefaultNewUserPasswordSeed = "12345678"

// seedTVSystemUser creates the headless account the TV dashboard logs in as
// automatically (no password ever checked for TVLogin, no login screen).
func seedTVSystemUser(db *gorm.DB) {
	var count int64
	db.Table("users").Where("identification_number = ?", TVSystemIdentification).Count(&count)
	if count > 0 {
		return
	}

	userType := findOrCreateBaseEntity(db, "user_types", "Visitante")
	dept := findOrCreateBaseEntity(db, "departments", "Indústria")

	userTypeJSON, _ := json.Marshal(models.ReferenceEntity{ID: userType.ID, Name: userType.Name})
	deptJSON, _ := json.Marshal(models.ReferenceEntity{ID: dept.ID, Name: dept.Name})
	allowedJSON, _ := json.Marshal([]string{authz.ServiceIndustria})

	tvUser := map[string]interface{}{
		"name":                  "TV Indústria",
		"identification_number": TVSystemIdentification,
		"user_type":             string(userTypeJSON),
		"department":            string(deptJSON),
		"work_hour_cost":        "0",
		"allowed_services":      string(allowedJSON),
		"must_change_password":  false,
	}

	db.Table("users").Create(&tvUser)
	log.Printf("🌱 Usuário de sistema da TV criado: identificação %s", TVSystemIdentification)
}
