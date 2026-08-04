package models

// Part é o catálogo de peças usado na pausa "Falta de Peça", na requisição por
// e-mail e na lista de materiais (BOM) do módulo Produção. UnitOfMeasure é
// fixo por peça (pç, cm, m, m², lt, kg, cj, ct) — a quantidade é informada por
// requisição/linha de BOM, não aqui. InternalCode e Supplier são opcionais,
// preenchidos quando a peça é usada em uma lista de materiais.
type Part struct {
	ID            string `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	UnitOfMeasure string `gorm:"column:unit_of_measure" json:"unitOfMeasure"`
	InternalCode  string `gorm:"column:internal_code" json:"internalCode"`
	Supplier      string `gorm:"column:supplier" json:"supplier"`
}

func (Part) TableName() string { return "parts" }
