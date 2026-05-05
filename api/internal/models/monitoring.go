package models

type Monitoring struct {
	ID             string           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	Identificador  string           `json:"identificador"`
	Unidade        string           `json:"unidade"`
	Estado         string           `json:"estado"`
	Cidade         string           `json:"cidade"`
	IHM            string           `gorm:"column:ihm" json:"ihm"`
	Gateway        string           `json:"gateway"`
	CLP            []string         `gorm:"type:jsonb;serializer:json;column:clp" json:"clp"`
	MACs           []string         `gorm:"type:jsonb;serializer:json;column:macs" json:"macs"`
	Mascara        string           `json:"mascara"`
	IDAnydesk      string           `gorm:"column:id_anydesk" json:"idAnydesk"`
	IDRustdesk     string           `gorm:"column:id_rustdesk" json:"idRustdesk"`
	IDTeamViewer   string           `gorm:"column:id_teamviewer" json:"idTeamViewer"`
	MonitoringType *ReferenceEntity `gorm:"type:jsonb;serializer:json;column:monitoring_type" json:"monitoringType"`
}

func (Monitoring) TableName() string { return "monitorings" }
