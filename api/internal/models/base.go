package models

type ReferenceEntity struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type BaseEntity struct {
	ID          string `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	Name        string `json:"name"`
	Description string `json:"description"`
}
