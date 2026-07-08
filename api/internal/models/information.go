package models

import "time"

type InformationAttachment struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	URL          string    `json:"url"`
	ContentType  string    `json:"contentType"`
	Size         int64     `json:"size"`
	UploadedAt   time.Time `json:"uploadedAt"`
}

type InformationDemand struct {
	ID                   string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt            time.Time  `json:"createdAt"`
	UpdatedAt            time.Time  `json:"updatedAt"`
	CreatedDate          time.Time  `gorm:"column:created_date" json:"createdDate"`
	CompletedDate        *time.Time `gorm:"column:completed_date" json:"completedDate"`
	RequestingDepartment string     `gorm:"column:requesting_department" json:"requestingDepartment"`
	Requester            string     `json:"requester"`
	Description          string     `json:"description"`
	Category             string     `json:"category"`
	Priority             string     `json:"priority"`
	Status               string     `json:"status"`
	Approval             string     `json:"approval"`
	HoursSpent           float64    `gorm:"column:hours_spent" json:"hoursSpent"`
	Attachments          []InformationAttachment `gorm:"type:jsonb;serializer:json" json:"attachments"`
}

func (InformationDemand) TableName() string { return "information_demands" }

type InformationApproval struct {
	ID         string           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt  time.Time        `json:"createdAt"`
	UpdatedAt  time.Time        `json:"updatedAt"`
	Date       time.Time        `json:"date"`
	Department string           `json:"department"`
	Request    string           `json:"request"`
	Approver   string           `json:"approver"`
	Status     string           `json:"status"`
	DemandID   *string          `gorm:"column:demand_id" json:"demandId"`
	Demand     *ReferenceEntity `gorm:"-" json:"demand,omitempty"`
}

func (InformationApproval) TableName() string { return "information_approvals" }

type InformationTraining struct {
	ID               string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
	Date             time.Time `json:"date"`
	Department       string    `json:"department"`
	Theme            string    `json:"theme"`
	ModulesCovered   string    `gorm:"column:modules_covered" json:"modulesCovered"`
	ParticipantNames string    `gorm:"column:participant_names" json:"participantNames"`
	TrainedCount     int       `gorm:"column:participants" json:"trainedCount"`
	Hours            float64   `json:"hours"`
	Attachments      []InformationAttachment `gorm:"type:jsonb;serializer:json" json:"attachments"`
}

func (InformationTraining) TableName() string { return "information_trainings" }

type InformationProcess struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	Date        time.Time `json:"date"`
	Department  string    `json:"department"`
	ProcessName string    `gorm:"column:process_name" json:"process"`
	Type        string    `json:"type"`
	Status      string    `json:"status"`
}

func (InformationProcess) TableName() string { return "information_processes" }

type InformationDailyRoutine struct {
	ID              string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
	Date            time.Time `json:"date"`
	Activity        string    `json:"activity"`
	DurationMinutes int       `gorm:"column:duration_minutes" json:"durationMinutes"`
	Status          string    `json:"status"`
}

func (InformationDailyRoutine) TableName() string { return "information_daily_routines" }

type InformationMeeting struct {
	ID            string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	Date          time.Time `json:"date"`
	Department    string    `json:"department"`
	Subject       string    `json:"subject"`
	DurationHours float64   `gorm:"column:duration_hours" json:"durationHours"`
}

func (InformationMeeting) TableName() string { return "information_meetings" }

type InformationDepartmentSupport struct {
	ID              string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
	Date            time.Time `json:"date"`
	Department      string    `json:"department"`
	SupportProvided string    `gorm:"column:support_provided" json:"supportProvided"`
	Hours           float64   `json:"hours"`
}

func (InformationDepartmentSupport) TableName() string { return "information_department_support" }

type InformationChecklistTemplate struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
	Activity   string    `json:"activity"`
	OrderIndex int       `gorm:"column:order_index" json:"orderIndex"`
}

func (InformationChecklistTemplate) TableName() string { return "information_checklist_templates" }

type InformationDailyChecklist struct {
	ID         string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
	TemplateID string    `gorm:"column:template_id" json:"templateId"`
	WeekStart  time.Time `gorm:"column:week_start" json:"weekStart"`
	Monday     bool      `json:"monday"`
	Tuesday    bool      `json:"tuesday"`
	Wednesday  bool      `json:"wednesday"`
	Thursday   bool      `json:"thursday"`
	Friday     bool      `json:"friday"`
}

func (InformationDailyChecklist) TableName() string { return "information_daily_checklist" }
