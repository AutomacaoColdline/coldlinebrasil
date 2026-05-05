package models

import "time"

type Process struct {
	ID                     string            `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	IdentificationNumber   string            `json:"identificationNumber"`
	ProcessTime            string            `json:"processTime"`
	StartDate              time.Time         `json:"startDate"`
	EndDate                *time.Time        `json:"endDate"`
	User                   *ReferenceEntity  `gorm:"type:jsonb;serializer:json;column:user_ref" json:"user"`
	Department             *ReferenceEntity  `gorm:"type:jsonb;serializer:json" json:"department"`
	ProcessType            *ReferenceEntity  `gorm:"type:jsonb;serializer:json" json:"processType"`
	Occurrences            []ReferenceEntity `gorm:"type:jsonb;serializer:json" json:"occurrences"`
	Machine                *ReferenceEntity  `gorm:"type:jsonb;serializer:json;column:machine_ref" json:"machine"`
	InOccurrence           bool              `json:"inOccurrence"`
	InOperatorOccurrence   bool              `json:"inOperatorOccurrence" gorm:"-"` // pausa por ocorrência do operador (não pausa automática do sistema)
	OccurrenceStartDate    *time.Time        `json:"occurrenceStartDate"`
	TotalOccurrenceSeconds int               `json:"totalOccurrenceSeconds"`
	Finished               bool              `json:"finished"`
	PreIndustrialization   bool              `json:"preIndustrialization"`
	ReWork                 bool              `json:"reWork"`
	Prototype              bool              `json:"prototype"`
}

func (Process) TableName() string { return "processes" }

type StartProcessRequest struct {
	IdentificationNumber string `json:"identificationNumber"`
	ProcessTypeId        string `json:"processTypeId"`
	MachineId            string `json:"machineId"`
	PreIndustrialization bool   `json:"preIndustrialization"`
	ReWork               bool   `json:"reWork"`
	Prototype            bool   `json:"prototype"`
}
