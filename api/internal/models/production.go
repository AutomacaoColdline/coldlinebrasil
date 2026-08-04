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
//
// InternalCode/UnitOfMeasure/Supplier são copiados da Part no momento em que
// a linha é criada, e daí em diante são editáveis por linha, independentes
// do catálogo (Part). Isso é proposital: o mesmo material (mesmo PartID) é
// normalmente reaproveitado tanto no BOM padrão quanto no de um cliente, e
// se esses três campos vivessem só na Part, editar o código/UN/fornecedor
// numa linha do cliente mudaria silenciosamente o que aparece também na
// linha do padrão (mesma Part) — nenhuma divergência de cadastro seria
// detectável. Denormalizados por linha, cada BOM guarda seu próprio registro
// e a aba "Divergências Comparativas" consegue comparar um contra o outro.
type ProductionBomItem struct {
	ID                string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
	ProductionModelID string    `gorm:"column:production_model_id" json:"productionModelId"`
	Variant           string    `json:"variant"`
	ClientBuildID     *string   `gorm:"column:client_build_id" json:"clientBuildId"`
	PartID            string    `gorm:"column:part_id" json:"partId"`
	Quantity          float64   `json:"quantity"`
	InternalCode      string    `gorm:"column:internal_code" json:"internalCode"`
	UnitOfMeasure     string    `gorm:"column:unit_of_measure" json:"unitOfMeasure"`
	Supplier          string    `json:"supplier"`
}

func (ProductionBomItem) TableName() string { return "production_bom_items" }

// EvaporatorAddressEntry é um par evaporador/endereço dentro do
// endereçamento de evaporadores de um ProductionClientBuild.
type EvaporatorAddressEntry struct {
	Evaporator string `json:"evaporator"`
	Address    string `json:"address"`
}

// ProductionClientBuild é um "Modelo Criado ao Cliente": uma unidade física
// específica de um modelo padrão — cliente (ou estoque) de destino, pedido/
// referência, número de série, se tem ventiladores (e, nesse caso, o
// endereçamento desses evaporadores) e o status de produção — com seu
// próprio BOM (ProductionBomItem com Variant="client").
type ProductionClientBuild struct {
	ID                      string                   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt               time.Time                `json:"createdAt"`
	UpdatedAt               time.Time                `json:"updatedAt"`
	ProductionModelID       string                   `gorm:"column:production_model_id" json:"productionModelId"`
	ClientName              string                   `gorm:"column:client_name" json:"clientName"`
	OrderReference          string                   `gorm:"column:order_reference" json:"orderReference"`
	SerialNumber            string                   `gorm:"column:serial_number" json:"serialNumber"`
	HasEvaporatorAddressing bool                     `gorm:"column:has_evaporator_addressing" json:"hasEvaporatorAddressing"`
	EvaporatorAddresses     []EvaporatorAddressEntry `gorm:"type:jsonb;serializer:json;column:evaporator_addresses" json:"evaporatorAddresses"`
	Status                  string                   `json:"status"`
	Notes                   string                   `json:"notes"`
}

func (ProductionClientBuild) TableName() string { return "production_client_builds" }

// ProductionBuildStatuses são os status válidos de produção de uma unidade.
var ProductionBuildStatuses = []string{"Em Andamento", "Concluído", "Parado"}
