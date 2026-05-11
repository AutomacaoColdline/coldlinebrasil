package models

type ColdvisioGuideStep struct {
	ID          string `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	StepOrder   int    `json:"stepOrder"`
	Title       string `json:"title"`
	Description string `gorm:"type:text" json:"description"`
	ImageData   string `gorm:"type:text" json:"imageData"`
}

func (ColdvisioGuideStep) TableName() string { return "coldvisio_guide_steps" }
