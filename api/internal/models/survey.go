package models

import "time"

// ClientSurveyStatus representa o andamento do contato de pesquisa de
// satisfação com um cliente.
type ClientSurveyStatus = string

const (
	SurveyNaoContatado       ClientSurveyStatus = "NAO_CONTATADO"
	SurveyContatoRealizado   ClientSurveyStatus = "CONTATO_REALIZADO"
	SurveyAguardandoResposta ClientSurveyStatus = "AGUARDANDO_RESPOSTA"
	SurveySemRetorno         ClientSurveyStatus = "SEM_RETORNO"
	SurveyRespondida         ClientSurveyStatus = "RESPONDIDA"
)

// ClientSurvey guarda, por cliente, o status atual do acompanhamento da
// pesquisa de satisfação (um registro por cliente).
type ClientSurvey struct {
	ID            string             `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	ClientID      string             `gorm:"column:client_id;uniqueIndex" json:"clientId"`
	Status        ClientSurveyStatus `json:"status"`
	ContactName   string             `gorm:"column:contact_name" json:"contactName"`
	ContactPhone  string             `gorm:"column:contact_phone" json:"contactPhone"`
	ContactEmail  string             `gorm:"column:contact_email" json:"contactEmail"`
	Notes         string             `json:"notes"`
	UpdatedBy     string             `gorm:"column:updated_by" json:"updatedBy"`
	UpdatedByName string             `gorm:"column:updated_by_name" json:"updatedByName"`
	UpdatedAt     time.Time          `gorm:"column:updated_at" json:"updatedAt"`
}

func (ClientSurvey) TableName() string { return "client_surveys" }
