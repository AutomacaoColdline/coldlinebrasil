package models

type Note struct {
	ID       string   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	Name     string   `json:"name"`
	Element  []string `gorm:"type:jsonb;serializer:json" json:"element"`
	NoteType int      `json:"noteType"`
}

func (Note) TableName() string { return "notes" }
