package models

import "time"

// ProductionModel é um modelo de equipamento Coldline (Cold 5S, Cold 10S,
// Cold 15SXT, Cold 20SE). Lista fechada, seedada no boot — cadastro serve só
// para dar um id estável a cada modelo, não é editável pela UI.
type ProductionModel struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
}

func (ProductionModel) TableName() string { return "production_models" }

// ProductionBomItem é uma linha de lista de materiais. Variant distingue o
// BOM padrão do modelo ("standard") do BOM de um pedido específico de cliente
// ("client"), nesse segundo caso ClientBuildID identifica o pedido.
type ProductionBomItem struct {
	ID                string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
	ProductionModelID string    `gorm:"column:production_model_id" json:"productionModelId"`
	Variant           string    `json:"variant"`
	ClientBuildID     *string   `gorm:"column:client_build_id" json:"clientBuildId"`
	PartID            string    `gorm:"column:part_id" json:"partId"`
	Quantity          float64   `json:"quantity"`
}

func (ProductionBomItem) TableName() string { return "production_bom_items" }

// ProductionClientBuild é um "Modelo Criado ao Cliente": um pedido específico
// de um modelo padrão, com seu próprio BOM (ProductionBomItem com
// Variant="client") e seus próprios números de série.
type ProductionClientBuild struct {
	ID                string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
	ProductionModelID string    `gorm:"column:production_model_id" json:"productionModelId"`
	ClientName        string    `gorm:"column:client_name" json:"clientName"`
	OrderReference    string    `gorm:"column:order_reference" json:"orderReference"`
}

func (ProductionClientBuild) TableName() string { return "production_client_builds" }

// EvaporatorAddressEntry é um par evaporador/endereço dentro do
// endereçamento de uma unidade (ProductionSerialNumber).
type EvaporatorAddressEntry struct {
	Evaporator string `json:"evaporator"`
	Address    string `json:"address"`
}

// ProductionSerialNumber é uma unidade física produzida dentro de um
// ProductionClientBuild: seu número de série, o cliente de destino, se tem
// endereçamento de evaporadores (e a listagem desse endereçamento) e o status
// de produção da unidade.
type ProductionSerialNumber struct {
	ID                      string                   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt               time.Time                `json:"createdAt"`
	UpdatedAt               time.Time                `json:"updatedAt"`
	ClientBuildID           string                   `gorm:"column:client_build_id" json:"clientBuildId"`
	SerialNumber            string                   `gorm:"column:serial_number" json:"serialNumber"`
	ClientDestination       string                   `gorm:"column:client_destination" json:"clientDestination"`
	HasEvaporatorAddressing bool                     `gorm:"column:has_evaporator_addressing" json:"hasEvaporatorAddressing"`
	EvaporatorAddresses     []EvaporatorAddressEntry `gorm:"type:jsonb;serializer:json;column:evaporator_addresses" json:"evaporatorAddresses"`
	Status                  string                   `json:"status"`
	Notes                   string                   `json:"notes"`
}

func (ProductionSerialNumber) TableName() string { return "production_serial_numbers" }

// ProductionSerialStatuses são os status válidos de uma unidade em produção.
var ProductionSerialStatuses = []string{"Em Andamento", "Concluido", "Parado"}
