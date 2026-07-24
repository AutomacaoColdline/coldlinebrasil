package models

import "time"

type MachineStatus int

const (
	WaitingProduction MachineStatus = 1
	InProgress        MachineStatus = 2
	InOccurrence      MachineStatus = 3
	InRework          MachineStatus = 4
	Finished          MachineStatus = 5
	Stop              MachineStatus = 6
)

type Machine struct {
	ID                   string            `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CustomerName         string            `json:"customerName"`
	IdentificationNumber string            `json:"identificationNumber"`
	SerialNumber         string            `gorm:"column:serial_number" json:"serialNumber"`
	Phase                string            `json:"phase"`
	Voltage              string            `json:"voltage"`
	Process              *ReferenceEntity  `gorm:"type:jsonb;serializer:json;column:process_ref" json:"process"`
	Quality              *ReferenceEntity  `gorm:"type:jsonb;serializer:json" json:"quality"`
	Monitoring           *ReferenceEntity  `gorm:"type:jsonb;serializer:json;column:monitoring_ref" json:"monitoring"`
	Status               MachineStatus     `json:"status"`
	MachineType          *ReferenceEntity  `gorm:"type:jsonb;serializer:json" json:"machineType"`
	Time                 string            `gorm:"column:time_val" json:"time"`
	CreatedAt            time.Time         `json:"createdAt"`
	Users                []ReferenceEntity `gorm:"type:jsonb;serializer:json" json:"users"`
	// IsStock indica que a máquina ainda está em estoque (sem número de série/cliente
	// definitivo atribuído). Controlado manualmente via checkbox no cadastro; o QR code
	// impresso na criação continua apontando pro mesmo registro depois de atribuído.
	IsStock bool `gorm:"column:is_stock;default:true" json:"isStock"`
}

func (Machine) TableName() string { return "machines" }
