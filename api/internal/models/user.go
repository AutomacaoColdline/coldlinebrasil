package models

type User struct {
	ID                   string           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	Name                 string           `json:"name"`
	Email                string           `json:"email"`
	Password             string           `json:"password,omitempty"`
	UserType             *ReferenceEntity `gorm:"type:jsonb;serializer:json;column:user_type" json:"userType"`
	Department           *ReferenceEntity `gorm:"type:jsonb;serializer:json" json:"department"`
	CurrentProcess       *ReferenceEntity `gorm:"type:jsonb;serializer:json" json:"currentProcess"`
	CurrentOccurrence    *ReferenceEntity `gorm:"type:jsonb;serializer:json" json:"currentOccurrence"`
	IdentificationNumber string           `json:"identificationNumber"`
	UrlPhoto             string           `json:"urlPhoto"`
	WorkHourCost         string           `gorm:"column:work_hour_cost" json:"workHourCost"`
}

func (User) TableName() string { return "users" }
