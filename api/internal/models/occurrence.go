package models

import "time"

type Occurrence struct {
	ID             string           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CodeOccurrence string           `json:"codeOccurrence"`
	ProcessTime    string           `json:"processTime"`
	StartDate      time.Time        `json:"startDate"`
	EndDate        *time.Time       `json:"endDate"`
	Process        *ReferenceEntity `gorm:"type:jsonb;serializer:json;column:process_ref" json:"process"`
	User           *ReferenceEntity `gorm:"type:jsonb;serializer:json;column:user_ref" json:"user"`
	Department     *ReferenceEntity `gorm:"type:jsonb;serializer:json" json:"department"`
	Finished       bool             `json:"finished"`
	Description    string           `json:"description"`
	OccurrenceType *ReferenceEntity `gorm:"type:jsonb;serializer:json" json:"occurrenceType"`
	Part           *ReferenceEntity `gorm:"type:jsonb;serializer:json;column:part_ref" json:"part"`
	Machine        *ReferenceEntity `gorm:"type:jsonb;serializer:json;column:machine_ref" json:"machine"`
}

func (Occurrence) TableName() string { return "occurrences" }
