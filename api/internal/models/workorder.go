package models

import (
	"math"
	"time"
)

type GeoPoint struct {
	Type        string    `json:"type"`
	Coordinates []float64 `json:"coordinates"`
}

func NewGeoPoint(lat, lon float64) *GeoPoint {
	return &GeoPoint{Type: "Point", Coordinates: []float64{lon, lat}}
}

func HaversineMeters(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000.0
	φ1 := lat1 * math.Pi / 180
	φ2 := lat2 * math.Pi / 180
	Δφ := (lat2 - lat1) * math.Pi / 180
	Δλ := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(Δφ/2)*math.Sin(Δφ/2) + math.Cos(φ1)*math.Cos(φ2)*math.Sin(Δλ/2)*math.Sin(Δλ/2)
	return R * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}

type Client struct {
	ID       string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	Name     string    `json:"name"`
	Document string    `json:"document"`
	Address  string    `json:"address"`
	Phone    string    `json:"phone"`
	Email    string    `json:"email"`
	Location *GeoPoint `gorm:"type:jsonb;serializer:json" json:"location"`
}

func (Client) TableName() string { return "clients" }

type OSStatus = string

const (
	OSAberta      OSStatus = "ABERTA"
	OSEmAndamento OSStatus = "EM_ANDAMENTO"
	OSConcluida   OSStatus = "CONCLUIDA"
	OSCancelada   OSStatus = "CANCELADA"
)

type TechAssignment struct {
	Technician *ReferenceEntity `json:"technician"`
	AssignedAt time.Time        `json:"assignedAt"`
}

type CheckEvent struct {
	Timestamp          time.Time `json:"timestamp"`
	Location           *GeoPoint `json:"location"`
	Accuracy           float64   `json:"accuracy"`
	DistanceFromTarget float64   `json:"distanceFromTarget"`
	OutsideRadius      bool      `json:"outsideRadius"`
}

type OSReport struct {
	ProblemDescription string    `json:"problemDescription"`
	Diagnosis          string    `json:"diagnosis"`
	WorkPerformed      string    `json:"workPerformed"`
	PartsUsed          string    `json:"partsUsed"`
	Notes              string    `json:"notes"`
	LastUpdatedAt      time.Time `json:"lastUpdatedAt"`
}

type OSImage struct {
	ID         string    `json:"id"`
	URL        string    `json:"url"`
	UploadedAt time.Time `json:"uploadedAt"`
	Annotation string    `json:"annotation"`
}

type TimelineEvent struct {
	Type      string                 `json:"type"`
	Timestamp time.Time              `json:"timestamp"`
	UserID    string                 `json:"userId"`
	UserName  string                 `json:"userName"`
	Metadata  map[string]interface{} `json:"metadata"`
}

const (
	TLCriada      = "CRIADA"
	TLAtribuida   = "ATRIBUIDA"
	TLCheckIn     = "CHECKIN"
	TLAtualizacao = "ATUALIZACAO"
	TLImagem      = "IMAGEM"
	TLCheckOut    = "CHECKOUT"
	TLConcluida   = "CONCLUIDA"
	TLCancelada   = "CANCELADA"
)

type WorkOrder struct {
	ID            string           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	OSNumber      string           `json:"osNumber"`
	Description   string           `json:"description"`
	Client        *ReferenceEntity `gorm:"type:jsonb;serializer:json;column:client_ref" json:"client"`
	Address       string           `json:"address"`
	Location      *GeoPoint        `gorm:"type:jsonb;serializer:json" json:"location"`
	AllowedRadius float64          `json:"allowedRadius"`
	Status        OSStatus         `json:"status"`
	Technicians   []TechAssignment `gorm:"type:jsonb;serializer:json" json:"technicians"`
	CheckIn       *CheckEvent      `gorm:"type:jsonb;serializer:json;column:check_in" json:"checkIn"`
	CheckOut      *CheckEvent      `gorm:"type:jsonb;serializer:json;column:check_out" json:"checkOut"`
	Report        *OSReport        `gorm:"type:jsonb;serializer:json" json:"report"`
	Images        []OSImage        `gorm:"type:jsonb;serializer:json" json:"images"`
	Timeline      []TimelineEvent  `gorm:"type:jsonb;serializer:json" json:"timeline"`
	CreatedAt     time.Time        `json:"createdAt"`
	UpdatedAt     time.Time        `json:"updatedAt"`
}

func (WorkOrder) TableName() string { return "work_orders" }
