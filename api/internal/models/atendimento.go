package models

import "time"

type AtendimentoStatus = string

const (
	AtendAberto            AtendimentoStatus = "ABERTO"
	AtendEmAndamento       AtendimentoStatus = "EM_ANDAMENTO"
	AtendAguardandoCliente AtendimentoStatus = "AGUARDANDO_CLIENTE"
	AtendAguardandoPeca    AtendimentoStatus = "AGUARDANDO_PECA"
	AtendResolvido         AtendimentoStatus = "RESOLVIDO"
	AtendEncerrado         AtendimentoStatus = "ENCERRADO"
)

type AtendimentoPriority = string

const (
	AtendPrioridadeBaixa   AtendimentoPriority = "BAIXA"
	AtendPrioridadeMedia   AtendimentoPriority = "MEDIA"
	AtendPrioridadeAlta    AtendimentoPriority = "ALTA"
	AtendPrioridadeCritica AtendimentoPriority = "CRITICA"
)

type AtendimentoEquipmentType = string

const (
	AtendEquipCLP   AtendimentoEquipmentType = "CLP"
	AtendEquipContr AtendimentoEquipmentType = "CONTROLADOR"
	AtendEquipIHM   AtendimentoEquipmentType = "IHM"
	AtendEquipGtw   AtendimentoEquipmentType = "GATEWAY"
	AtendEquipSup   AtendimentoEquipmentType = "SISTEMA_SUPERVISORIO"
	AtendEquipOutro AtendimentoEquipmentType = "OUTRO"
)

type AtendimentoFile struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	URL        string    `json:"url"`
	MimeType   string    `json:"mimeType"`
	Size       int64     `json:"size"`
	Kind       string    `json:"kind"`
	UploadedAt time.Time `json:"uploadedAt"`
	UploadedBy string    `json:"uploadedBy"`
	UploadedByName string `json:"uploadedByName"`
	Section    string    `json:"section"`
}

type AtendimentoDiagnosisEdit struct {
	Field     string                 `json:"field"`
	OldValue  string                 `json:"oldValue"`
	NewValue  string                 `json:"newValue"`
	UserID    string                 `json:"userId"`
	UserName  string                 `json:"userName"`
	Timestamp time.Time              `json:"timestamp"`
	Metadata  map[string]interface{} `json:"metadata"`
}

type AtendimentoChecklistItem struct {
	ID         string    `json:"id"`
	Text       string    `json:"text"`
	Checked    bool      `json:"checked"`
	CheckedBy  string    `json:"checkedBy"`
	CheckedAt  *time.Time `json:"checkedAt"`
	Category   string    `json:"category"`
}

type AtendimentoChecklistTemplate struct {
	ID        string                    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	Name      string                    `gorm:"column:name" json:"name"`
	Category  string                    `gorm:"column:category" json:"category"`
	Items     []AtendimentoChecklistItem `gorm:"type:jsonb;serializer:json;column:items" json:"items"`
	CreatedAt time.Time                 `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time                 `gorm:"column:updated_at" json:"updatedAt"`
}

func (AtendimentoChecklistTemplate) TableName() string { return "atendimento_checklist_templates" }

type AtendimentoTimeLog struct {
	ID         string    `json:"id"`
	StartTime  time.Time `json:"startTime"`
	EndTime    *time.Time `json:"endTime"`
	Duration   int       `json:"duration"`
	IsTravel   bool      `json:"isTravel"`
	UserID     string    `json:"userId"`
	UserName   string    `json:"userName"`
	Notes      string    `json:"notes"`
}

type AtendimentoSignature struct {
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	Document  string    `json:"document"`
	SignedAt  time.Time `json:"signedAt"`
	IPAddress string    `json:"ipAddress"`
}

type Atendimento struct {
	ID                    string                  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	Number                string                  `json:"number"`
	OpenDate              time.Time               `json:"openDate"`
	CloseDate             *time.Time              `json:"closeDate"`
	Status                AtendimentoStatus       `json:"status"`
	Priority              AtendimentoPriority     `json:"priority"`

	Client                *ReferenceEntity        `gorm:"type:jsonb;serializer:json;column:client_ref" json:"client"`
	ClientName            string                  `json:"clientName"`
	ClientDocument        string                  `json:"clientDocument"`
	ClientPhone           string                  `json:"clientPhone"`
	ClientEmail           string                  `json:"clientEmail"`
	ClientAddress         string                  `json:"clientAddress"`

	Technician            *ReferenceEntity        `gorm:"type:jsonb;serializer:json;column:technician_ref" json:"technician"`
	Team                  string                  `json:"team"`

	ProblemDescription    string                  `json:"problemDescription"`
	Equipment             string                  `json:"equipment"`
	InstallationLocation  string                  `json:"installationLocation"`
	SerialNumber          string                  `json:"serialNumber"`

	EquipmentType         AtendimentoEquipmentType `json:"equipmentType"`
	EquipmentRef          *ReferenceEntity         `gorm:"type:jsonb;serializer:json;column:equipment_ref" json:"equipmentRef"`

	InitialDiagnosis      string                  `json:"initialDiagnosis"`
	FinalDiagnosis        string                  `json:"finalDiagnosis"`
	IdentifiedCause       string                  `json:"identifiedCause"`
	AppliedSolution       string                  `json:"appliedSolution"`
	CorrectiveActions     string                  `json:"correctiveActions"`
	PreventiveActions     string                  `json:"preventiveActions"`
	InternalObservations  string                  `json:"internalObservations"`
	DiagnosisHistory      []AtendimentoDiagnosisEdit `gorm:"type:jsonb;serializer:json" json:"diagnosisHistory"`

	Images                []AtendimentoFile       `gorm:"type:jsonb;serializer:json" json:"images"`
	Documents             []AtendimentoFile       `gorm:"type:jsonb;serializer:json" json:"documents"`

	TimeLogs              []AtendimentoTimeLog    `gorm:"type:jsonb;serializer:json" json:"timeLogs"`
	TotalTimeMinutes      int                     `json:"totalTimeMinutes"`
	TravelTimeMinutes     int                     `json:"travelTimeMinutes"`

	ChecklistItems        []AtendimentoChecklistItem `gorm:"type:jsonb;serializer:json" json:"checklistItems"`
	ChecklistName         string                  `json:"checklistName"`

	TechnicianSignature   *AtendimentoSignature   `gorm:"type:jsonb;serializer:json" json:"technicianSignature"`
	ClientSignature       *AtendimentoSignature   `gorm:"type:jsonb;serializer:json" json:"clientSignature"`

	Tags                  []string                `gorm:"type:jsonb;serializer:json" json:"tags"`

	IsKnowledgeBase       bool                    `json:"isKnowledgeBase"`
	KBProblem             string                  `json:"kbProblem"`
	KBCause               string                  `json:"kbCause"`
	KBSolution            string                  `json:"kbSolution"`
	KBEquipments          []string                `gorm:"type:jsonb;serializer:json" json:"kbEquipments"`

	Timeline              []TimelineEvent         `gorm:"type:jsonb;serializer:json" json:"timeline"`

	CreatedAt             time.Time               `json:"createdAt"`
	UpdatedAt             time.Time               `json:"updatedAt"`
	CreatedBy             *ReferenceEntity        `gorm:"type:jsonb;serializer:json;column:created_by" json:"createdBy"`
}

func (Atendimento) TableName() string { return "atendimentos" }
