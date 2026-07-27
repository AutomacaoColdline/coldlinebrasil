package models

import "time"

// RequisitionPart é uma peça requisitada dentro de uma ocorrência "Falta de
// Peça": além de id/nome, carrega a quantidade pedida e a unidade de medida
// (copiada da peça no momento da requisição). Ocorrências antigas gravadas
// antes desse campo existir continuam sendo lidas normalmente, só com
// Quantity/UnitOfMeasure zerados.
type RequisitionPart struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Quantity      float64 `json:"quantity"`
	UnitOfMeasure string  `json:"unitOfMeasure"`
}

type Occurrence struct {
	ID             string            `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CodeOccurrence string            `json:"codeOccurrence"`
	ProcessTime    string            `json:"processTime"`
	StartDate      time.Time         `json:"startDate"`
	EndDate        *time.Time        `json:"endDate"`
	Process        *ReferenceEntity  `gorm:"type:jsonb;serializer:json;column:process_ref" json:"process"`
	User           *ReferenceEntity  `gorm:"type:jsonb;serializer:json;column:user_ref" json:"user"`
	Department     *ReferenceEntity  `gorm:"type:jsonb;serializer:json" json:"department"`
	Finished       bool              `json:"finished"`
	Description    string            `json:"description"`
	OccurrenceType *ReferenceEntity  `gorm:"type:jsonb;serializer:json" json:"occurrenceType"`
	Parts          []RequisitionPart `gorm:"type:jsonb;serializer:json;column:parts_ref" json:"parts"`
	Machine        *ReferenceEntity  `gorm:"type:jsonb;serializer:json;column:machine_ref" json:"machine"`
	EmailSent      *bool             `gorm:"-" json:"emailSent,omitempty"`
}

func (Occurrence) TableName() string { return "occurrences" }
