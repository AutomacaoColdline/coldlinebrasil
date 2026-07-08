package models

import "time"

type ColdvisioGuideStep struct {
	ID          string `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	Product     string `gorm:"index;default:coldvisio" json:"product,omitempty"`
	StepOrder   int    `json:"stepOrder"`
	Title       string `json:"title"`
	Description string `gorm:"type:text" json:"description"`
	ImageData   string `gorm:"type:text" json:"imageData"`
}

func (ColdvisioGuideStep) TableName() string { return "coldvisio_guide_steps" }

type ColdvisioUpdateEntry struct {
	ID          string                `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	Version     string                `json:"version"`
	Title       string                `json:"title"`
	Notes       string                `gorm:"type:text" json:"notes"`
	FileName    string                `json:"fileName"`
	ContentType string                `json:"contentType"`
	FileSize    int64                 `json:"fileSize"`
	FileData    []byte                `gorm:"type:bytea" json:"-"`
	Files       []ColdvisioUpdateFile `gorm:"foreignKey:EntryID;constraint:OnDelete:CASCADE" json:"files,omitempty"`
	CreatedAt   time.Time             `json:"createdAt"`
	UpdatedAt   time.Time             `json:"updatedAt"`
}

func (ColdvisioUpdateEntry) TableName() string { return "coldvisio_update_entries" }

type ColdvisioUpdateFile struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	EntryID     string    `gorm:"type:uuid;index" json:"entryId"`
	FileName    string    `json:"fileName"`
	ContentType string    `json:"contentType"`
	FileSize    int64     `json:"fileSize"`
	FileData    []byte    `gorm:"type:bytea" json:"-"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func (ColdvisioUpdateFile) TableName() string { return "coldvisio_update_files" }
