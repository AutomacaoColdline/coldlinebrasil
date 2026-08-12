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
	seedConfigTable(db, "occurrence_types", models.PauseReasonOrder)
	migrateIndustriaStageTypes(db)
	backfillMachineSerialNumbers(db)
	backfillPartUnitOfMeasure(db)
	seedConfigTable(db, "machine_types", []string{
		"Compressor", "Bomba", "Motor", "Gerador", "Painel Elétrico", "CLP", "IHM",
	})
	seedConfigTable(db, "monitoring_types", []string{
		"XWEB", "SITRAD", "COLDVISIO",
	})

	seedProductionModels(db)
	backfillProductionBomItemFields(db)
	backfillOrgChartAssignment(db)

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

// migrateIndustriaStageTypes garante que process_types tenha exatamente os 5
// processos de fabricação (models.StageOrder) e que occurrence_types tenha
// exatamente os 2 motivos de pausa (models.PauseReasonOrder) — é uma lista
// fechada ("apenas esses"), não um conjunto livre editável.  Roda em todo
// boot, idempotente: garante que os nomes canônicos existam e remove
// qualquer outro nome (seed antigo de manutenção, digitado errado, teste,
// etc.), exceto o tipo de pausa automática do sistema ("Sistema - Fora do
// Expediente"), que o scheduler cria e depende do nome exato. Deletar uma
// linha daqui não afeta processos/ocorrências já registrados — o nome fica
// gravado neles como snapshot, não como referência viva.
func migrateIndustriaStageTypes(db *gorm.DB) {
	for _, name := range models.StageOrder {
		findOrCreateBaseEntity(db, "process_types", name)
	}
	for _, name := range models.PauseReasonOrder {
		findOrCreateBaseEntity(db, "occurrence_types", name)
	}
	if res := db.Table("process_types").Where("name NOT IN ?", models.StageOrder).Delete(&models.BaseEntity{}); res.RowsAffected > 0 {
		log.Printf("🌱 process_types: %d tipo(s) fora da lista dos 5 processos removido(s)", res.RowsAffected)
	}
	keepOccurrenceTypes := append(append([]string{}, models.PauseReasonOrder...), models.SystemOccurrenceTypeName)
	if res := db.Table("occurrence_types").Where("name NOT IN ?", keepOccurrenceTypes).Delete(&models.BaseEntity{}); res.RowsAffected > 0 {
		log.Printf("🌱 occurrence_types: %d motivo(s) fora da lista dos 2 motivos removido(s)", res.RowsAffected)
	}
}

// backfillMachineSerialNumbers copia identification_number pra serial_number
// em máquinas antigas que ficaram sem série (não existe numeração separada —
// o código de identificação já É o número de série). Roda em todo boot,
// idempotente: só toca máquina com serial ainda vazio. Máquinas novas já
// nascem com a série preenchida (ver MachineHandler.Create).
func backfillMachineSerialNumbers(db *gorm.DB) {
	res := db.Table("machines").
		Where("(serial_number IS NULL OR serial_number = '') AND identification_number <> ''").
		Updates(map[string]interface{}{"serial_number": gorm.Expr("identification_number")})
	if res.RowsAffected > 0 {
		log.Printf("🌱 machines: %d máquina(s) tiveram número de série preenchido a partir do código de identificação", res.RowsAffected)
	}
}

// backfillPartUnitOfMeasure preenche "pç" nas peças antigas que ficaram sem
// unidade de medida (campo introduzido depois que peças já existiam,
// criadas inline no picker sem esse dado). Roda em todo boot, idempotente.
func backfillPartUnitOfMeasure(db *gorm.DB) {
	res := db.Table("parts").
		Where("unit_of_measure IS NULL OR unit_of_measure = ''").
		Update("unit_of_measure", "pç")
	if res.RowsAffected > 0 {
		log.Printf("🌱 parts: %d peça(s) tiveram unidade de medida preenchida com 'pç'", res.RowsAffected)
	}
}

// backfillProductionBomItemFields preenche InternalCode/UnitOfMeasure/Supplier
// nas linhas de BOM criadas antes desses campos existirem por linha (campo
// introduzido depois que o módulo Produção já estava em uso — até então esses
// dados só existiam na Part referenciada). Copia o valor atual da Part uma
// única vez; a partir daí a linha vira dona do próprio registro. Idempotente
// (só afeta linhas ainda com unit_of_measure vazio), roda em todo boot.
func backfillProductionBomItemFields(db *gorm.DB) {
	res := db.Exec(`
		UPDATE production_bom_items b
		SET internal_code = p.internal_code,
		    unit_of_measure = COALESCE(NULLIF(p.unit_of_measure, ''), 'pç'),
		    supplier = p.supplier
		FROM parts p
		WHERE b.part_id = p.id AND (b.unit_of_measure IS NULL OR b.unit_of_measure = '')
	`)
	if res.Error != nil {
		log.Printf("⚠️ falha ao preencher cadastro das linhas de BOM antigas: %v", res.Error)
		return
	}
	if res.RowsAffected > 0 {
		log.Printf("🌱 production_bom_items: %d linha(s) tiveram cód. interno/UN/fornecedor preenchidos a partir da peça", res.RowsAffected)
	}
}

// backfillOrgChartAssignment cobre a migração do organograma único (campo
// OrgChartID introduzido depois que cargos/áreas já existiam) pro modelo de
// múltiplos organogramas (um por empresa/CNPJ). Se existir algum cargo ou
// área sem org_chart_id, cria (uma única vez) um organograma padrão
// "Organograma Principal" e vincula tudo que estava solto a ele, pra não
// perder nada que já tinha sido cadastrado. Idempotente, roda em todo boot.
func backfillOrgChartAssignment(db *gorm.DB) {
	var positionsWithoutChart, departmentsWithoutChart int64
	db.Table("information_positions").Where("org_chart_id IS NULL").Count(&positionsWithoutChart)
	db.Table("information_org_departments").Where("org_chart_id IS NULL").Count(&departmentsWithoutChart)
	if positionsWithoutChart == 0 && departmentsWithoutChart == 0 {
		return
	}

	var defaultChart models.InformationOrgChart
	err := db.Where("name = ?", "Organograma Principal").First(&defaultChart).Error
	if err != nil {
		defaultChart = models.InformationOrgChart{Name: "Organograma Principal", OrderIndex: 0}
		if err := db.Create(&defaultChart).Error; err != nil {
			log.Printf("⚠️ falha ao criar organograma padrão pro backfill: %v", err)
			return
		}
		log.Printf("🌱 information_org_charts: criado organograma padrão \"Organograma Principal\" pra receber cargos/áreas existentes")
	}

	if positionsWithoutChart > 0 {
		res := db.Table("information_positions").Where("org_chart_id IS NULL").Update("org_chart_id", defaultChart.ID)
		if res.Error != nil {
			log.Printf("⚠️ falha ao vincular cargos antigos ao organograma padrão: %v", res.Error)
		} else if res.RowsAffected > 0 {
			log.Printf("🌱 information_positions: %d cargo(s) vinculados ao organograma \"Organograma Principal\"", res.RowsAffected)
		}
	}
	if departmentsWithoutChart > 0 {
		res := db.Table("information_org_departments").Where("org_chart_id IS NULL").Update("org_chart_id", defaultChart.ID)
		if res.Error != nil {
			log.Printf("⚠️ falha ao vincular áreas antigas ao organograma padrão: %v", res.Error)
		} else if res.RowsAffected > 0 {
			log.Printf("🌱 information_org_departments: %d área(s) vinculada(s) ao organograma \"Organograma Principal\"", res.RowsAffected)
		}
	}
}

// seedProductionModels garante que os 4 modelos de equipamento do módulo
// Produção existam, identificados por slug (lista fechada, definida pelo
// negócio — não é criada pela UI). Idempotente: roda em todo boot.
func seedProductionModels(db *gorm.DB) {
	models_ := []struct{ Name, Slug string }{
		{"Cold 5S", "cold-5s"},
		{"Cold 10S", "cold-10s"},
		{"Cold 15SXT", "cold-15sxt"},
		{"Cold 20SE", "cold-20se"},
	}
	for _, m := range models_ {
		var count int64
		db.Table("production_models").Where("slug = ?", m.Slug).Count(&count)
		if count > 0 {
			continue
		}
		db.Table("production_models").Create(&models.ProductionModel{Name: m.Name, Slug: m.Slug})
		log.Printf("🌱 Modelo de produção criado: %s", m.Name)
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
