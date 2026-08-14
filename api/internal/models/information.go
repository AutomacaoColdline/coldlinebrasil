package models

import "time"

type InformationAttachment struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	URL          string    `json:"url"`
	ContentType  string    `json:"contentType"`
	Size         int64     `json:"size"`
	UploadedAt   time.Time `json:"uploadedAt"`
}

type InformationDemand struct {
	ID                   string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt            time.Time  `json:"createdAt"`
	UpdatedAt            time.Time  `json:"updatedAt"`
	CreatedDate          time.Time  `gorm:"column:created_date" json:"createdDate"`
	CompletedDate        *time.Time `gorm:"column:completed_date" json:"completedDate"`
	RequestingDepartment string     `gorm:"column:requesting_department" json:"requestingDepartment"`
	Requester            string     `json:"requester"`
	Description          string     `json:"description"`
	Category             string     `json:"category"`
	Priority             string     `json:"priority"`
	Status               string     `json:"status"`
	Approval             string     `json:"approval"`
	HoursSpent           float64    `gorm:"column:hours_spent" json:"hoursSpent"`
	Attachments          []InformationAttachment `gorm:"type:jsonb;serializer:json" json:"attachments"`
}

func (InformationDemand) TableName() string { return "information_demands" }

type InformationApproval struct {
	ID         string           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt  time.Time        `json:"createdAt"`
	UpdatedAt  time.Time        `json:"updatedAt"`
	Date       time.Time        `json:"date"`
	Department string           `json:"department"`
	Request    string           `json:"request"`
	Approver   string           `json:"approver"`
	Status     string           `json:"status"`
	DemandID   *string          `gorm:"column:demand_id" json:"demandId"`
	Demand     *ReferenceEntity `gorm:"-" json:"demand,omitempty"`
}

func (InformationApproval) TableName() string { return "information_approvals" }

type InformationTraining struct {
	ID               string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
	Date             time.Time `json:"date"`
	Department       string    `json:"department"`
	Theme            string    `json:"theme"`
	ModulesCovered   string    `gorm:"column:modules_covered" json:"modulesCovered"`
	ParticipantNames string    `gorm:"column:participant_names" json:"participantNames"`
	TrainedCount     int       `gorm:"column:participants" json:"trainedCount"`
	Hours            float64   `json:"hours"`
	Attachments      []InformationAttachment `gorm:"type:jsonb;serializer:json" json:"attachments"`
}

func (InformationTraining) TableName() string { return "information_trainings" }

type InformationProcess struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	Date        time.Time `json:"date"`
	Department  string    `json:"department"`
	ProcessName string    `gorm:"column:process_name" json:"process"`
	Type        string    `json:"type"`
	Status      string    `json:"status"`
}

func (InformationProcess) TableName() string { return "information_processes" }

type InformationDailyRoutine struct {
	ID              string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
	Date            time.Time `json:"date"`
	Activity        string    `json:"activity"`
	DurationMinutes int       `gorm:"column:duration_minutes" json:"durationMinutes"`
	Status          string    `json:"status"`
}

func (InformationDailyRoutine) TableName() string { return "information_daily_routines" }

type InformationMeeting struct {
	ID            string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	Date          time.Time `json:"date"`
	Department    string    `json:"department"`
	Subject       string    `json:"subject"`
	DurationHours float64   `gorm:"column:duration_hours" json:"durationHours"`
}

func (InformationMeeting) TableName() string { return "information_meetings" }

type InformationDepartmentSupport struct {
	ID              string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
	Date            time.Time `json:"date"`
	Department      string    `json:"department"`
	SupportProvided string    `gorm:"column:support_provided" json:"supportProvided"`
	Hours           float64   `json:"hours"`
}

func (InformationDepartmentSupport) TableName() string { return "information_department_support" }

type InformationChecklistTemplate struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
	Activity   string    `json:"activity"`
	OrderIndex int       `gorm:"column:order_index" json:"orderIndex"`
}

func (InformationChecklistTemplate) TableName() string { return "information_checklist_templates" }

type InformationDailyChecklist struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
	TemplateID string    `gorm:"column:template_id" json:"templateId"`
	WeekStart  time.Time `gorm:"column:week_start" json:"weekStart"`
	Monday     bool      `json:"monday"`
	Tuesday    bool      `json:"tuesday"`
	Wednesday  bool      `json:"wednesday"`
	Thursday   bool      `json:"thursday"`
	Friday     bool      `json:"friday"`
}

func (InformationDailyChecklist) TableName() string { return "information_daily_checklist" }

// InformationOrgChart representa um organograma independente (ex: um por
// CNPJ/empresa do grupo). Cargos e áreas (InformationOrgDepartment) ficam
// vinculados a um organograma via OrgChartID.
type InformationOrgChart struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	Name      string    `json:"name"`
	// Revision e um texto livre (ex: "REV01 24/01/2025") que o usuario
	// preenche manualmente e substitui a data automatica no cabecalho da
	// impressao/PDF (ver OrgChartPrintPage.jsx).
	Revision   string `json:"revision"`
	OrderIndex int    `gorm:"column:order_index" json:"orderIndex"`
}

func (InformationOrgChart) TableName() string { return "information_org_charts" }

// Um cargo pode ter ate 3 "superiores" (ParentID + ParentID2 + ParentID3),
// pois na pratica um departamento as vezes responde a mais de um "mestre".
// ParentID e o vinculo principal — decide onde o card fica posicionado na
// arvore. ParentID2/ParentID3 sao vinculos extras, desenhados como linhas
// pontilhadas adicionais no organograma (ver orgChartUtils.js).
type InformationPosition struct {
	ID           string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
	Name         string    `json:"name"`
	OrgChartID   *string   `gorm:"column:org_chart_id" json:"orgChartId"`
	ParentID     *string   `gorm:"column:parent_id" json:"parentId"`
	ParentID2    *string   `gorm:"column:parent_id_2" json:"parentId2"`
	ParentID3    *string   `gorm:"column:parent_id_3" json:"parentId3"`
	DepartmentID *string   `gorm:"column:department_id" json:"departmentId"`
	// Ordem de exibicao (na lista e no organograma). Comeca na ordem de
	// cadastro (definida em CreatePosition) e pode ser alterada arrastando/
	// movendo o cargo na lista (ver ReorderPositions).
	OrderIndex int `gorm:"column:order_index" json:"orderIndex"`
	// Linha (fileira) onde o cargo aparece no organograma. Quando nil, a
	// linha e calculada automaticamente (linha do superior principal + 1,
	// raiz = 1). Preencher manualmente fixa o cargo numa fileira especifica
	// sem afetar a hierarquia (ver buildPositionRows em orgChartUtils.js).
	Line *int `gorm:"column:line" json:"line"`
}

func (InformationPosition) TableName() string { return "information_positions" }

type InformationOrgDepartment struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
	Name       string    `json:"name"`
	OrgChartID *string   `gorm:"column:org_chart_id" json:"orgChartId"`
	OrderIndex int       `gorm:"column:order_index" json:"orderIndex"`
}

func (InformationOrgDepartment) TableName() string { return "information_org_departments" }
