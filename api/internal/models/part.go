package models

// Part é o catálogo de peças usado na pausa "Falta de Peça" e na requisição por
// e-mail. UnitOfMeasure é fixo por peça (pç, cm, m) — a quantidade é informada
// por requisição, não aqui.
type Part struct {
	ID            string `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	UnitOfMeasure string `gorm:"column:unit_of_measure" json:"unitOfMeasure"`
}

func (Part) TableName() string { return "parts" }
