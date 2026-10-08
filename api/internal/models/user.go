package models

import "time"

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
	AllowedServices      []string         `gorm:"type:jsonb;serializer:json;column:allowed_services" json:"allowedServices"`
	// ServiceLevels: nivel por servico liberado ("view", "edit", "delete").
	// Servico sem nivel definido = acesso completo (comportamento antigo).
	ServiceLevels        map[string]string `gorm:"type:jsonb;serializer:json;column:service_levels" json:"serviceLevels"`
	MustChangePassword   bool             `gorm:"column:must_change_password;default:true" json:"mustChangePassword"`
	// PasswordResetToken/PasswordResetExpiresAt: json:"-" de propósito - nunca
	// devem aparecer em nenhuma resposta da API (GetAll, GetByID, Login...).
	PasswordResetToken     string     `gorm:"column:password_reset_token" json:"-"`
	PasswordResetExpiresAt *time.Time `gorm:"column:password_reset_expires_at" json:"-"`
}

func (User) TableName() string { return "users" }
