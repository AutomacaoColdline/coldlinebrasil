package handlers

import (
	"context"
	"fmt"
	"io"
	"math"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var defaultInformationChecklistActivities = []string{
	"Verificar CRM",
	"Verificar ERP",
	"Conferir chamados",
	"Atualizar processos",
}

type InformationHandler struct {
	db                    *gorm.DB
	demandRepo            *repositories.Repository[models.InformationDemand]
	approvalRepo          *repositories.Repository[models.InformationApproval]
	trainingRepo          *repositories.Repository[models.InformationTraining]
	processRepo           *repositories.Repository[models.InformationProcess]
	routineRepo           *repositories.Repository[models.InformationDailyRoutine]
	meetingRepo           *repositories.Repository[models.InformationMeeting]
	supportRepo           *repositories.Repository[models.InformationDepartmentSupport]
	checklistTemplateRepo *repositories.Repository[models.InformationChecklistTemplate]
	checklistEntryRepo    *repositories.Repository[models.InformationDailyChecklist]
	positionRepo          *repositories.Repository[models.InformationPosition]
	orgDepartmentRepo     *repositories.Repository[models.InformationOrgDepartment]
	orgChartRepo          *repositories.Repository[models.InformationOrgChart]
}

func NewInformationHandler(db *gorm.DB) *InformationHandler {
	return &InformationHandler{
		db:                    db,
		demandRepo:            repositories.New[models.InformationDemand](db, "information_demands"),
		approvalRepo:          repositories.New[models.InformationApproval](db, "information_approvals"),
		trainingRepo:          repositories.New[models.InformationTraining](db, "information_trainings"),
		processRepo:           repositories.New[models.InformationProcess](db, "information_processes"),
		routineRepo:           repositories.New[models.InformationDailyRoutine](db, "information_daily_routines"),
		meetingRepo:           repositories.New[models.InformationMeeting](db, "information_meetings"),
		supportRepo:           repositories.New[models.InformationDepartmentSupport](db, "information_department_support"),
		checklistTemplateRepo: repositories.New[models.InformationChecklistTemplate](db, "information_checklist_templates"),
		checklistEntryRepo:    repositories.New[models.InformationDailyChecklist](db, "information_daily_checklist"),
		positionRepo:          repositories.New[models.InformationPosition](db, "information_positions"),
		orgDepartmentRepo:     repositories.New[models.InformationOrgDepartment](db, "information_org_departments"),
		orgChartRepo:          repositories.New[models.InformationOrgChart](db, "information_org_charts"),
	}
}

func parseFlexibleDate(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}

	layouts := []string{time.RFC3339, "2006-01-02"}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, value); err == nil {
			utc := parsed.UTC()
			return &utc, nil
		}
	}

	return nil, strconv.ErrSyntax
}

func parsePagination(c *gin.Context, defaultPageSize, maxPageSize int) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", strconv.Itoa(defaultPageSize)))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > maxPageSize {
		pageSize = defaultPageSize
	}
	return page, pageSize
}

func applyTextFilter(db *gorm.DB, column, value string) *gorm.DB {
	value = strings.TrimSpace(value)
	if value == "" {
		return db
	}
	return db.Where(column+" ILIKE ?", "%"+value+"%")
}

func applyExactFilter(db *gorm.DB, column, value string) *gorm.DB {
	value = strings.TrimSpace(value)
	if value == "" {
		return db
	}
	return db.Where(column+" = ?", value)
}

func applyDateColumnRange(db *gorm.DB, column string, start, end *time.Time) *gorm.DB {
	if start != nil {
		db = db.Where(column+" >= ?", start.UTC())
	}
	if end != nil {
		db = db.Where(column+" <= ?", end.UTC())
	}
	return db
}

func listPaginated[T any](db *gorm.DB, page, pageSize int, order string) ([]T, int64, int, error) {
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, 0, err
	}

	var items []T
	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages < 1 {
		totalPages = 1
	}

	if err := db.Offset((page - 1) * pageSize).Limit(pageSize).Order(order).Find(&items).Error; err != nil {
		return nil, 0, 0, err
	}

	return items, total, totalPages, nil
}

func normalizeDemand(input *models.InformationDemand) {
	if input.CreatedDate.IsZero() {
		input.CreatedDate = time.Now().UTC()
	}
	if strings.TrimSpace(input.Status) == "" {
		input.Status = "Aberto"
	}
	if strings.TrimSpace(input.Approval) == "" {
		input.Approval = "Aguardando"
	}
	if strings.EqualFold(strings.TrimSpace(input.Status), "Concluido") && input.CompletedDate == nil {
		now := time.Now().UTC()
		input.CompletedDate = &now
	}
	if input.Attachments == nil {
		input.Attachments = []models.InformationAttachment{}
	}
	input.HoursSpent = calculateInformationHours(input.CreatedDate, input.CompletedDate)
}

func calculateInformationHours(start time.Time, end *time.Time) float64 {
	if end == nil {
		return 0
	}
	if !end.After(start) {
		return 0
	}
	return math.Round(end.Sub(start).Hours()*100) / 100
}

func parseOptionalJSONTime(raw interface{}) (*time.Time, error) {
	switch value := raw.(type) {
	case nil:
		return nil, nil
	case string:
		value = strings.TrimSpace(value)
		if value == "" {
			return nil, nil
		}
		parsed, err := time.Parse(time.RFC3339, value)
		if err != nil {
			return nil, err
		}
		utc := parsed.UTC()
		return &utc, nil
	default:
		return nil, strconv.ErrSyntax
	}
}

func splitTrainingParticipantNames(raw string) []string {
	parts := strings.FieldsFunc(raw, func(r rune) bool {
		switch r {
		case '\n', '\r', ',', ';':
			return true
		default:
			return false
		}
	})

	names := make([]string, 0, len(parts))
	for _, part := range parts {
		name := strings.TrimSpace(part)
		if name == "" {
			continue
		}
		names = append(names, name)
	}
	return names
}

func normalizeTraining(input *models.InformationTraining) {
	if input.Date.IsZero() {
		input.Date = time.Now().UTC()
	}
	input.ModulesCovered = strings.TrimSpace(input.ModulesCovered)
	input.ParticipantNames = strings.TrimSpace(input.ParticipantNames)
	if input.Attachments == nil {
		input.Attachments = []models.InformationAttachment{}
	}

	derivedCount := len(splitTrainingParticipantNames(input.ParticipantNames))
	if derivedCount > 0 {
		input.TrainedCount = derivedCount
	} else if input.TrainedCount < 0 {
		input.TrainedCount = 0
	}
}

func normalizeRoutine(input *models.InformationDailyRoutine) {
	if input.Date.IsZero() {
		input.Date = time.Now().UTC()
	}
	if strings.TrimSpace(input.Status) == "" {
		input.Status = "Nao iniciado"
	}
}

func uploadInformationAttachment(c *gin.Context) (*models.InformationAttachment, error) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		return nil, fmt.Errorf("arquivo nao encontrado")
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	attachmentID := fmt.Sprintf("%d_%04d", time.Now().UnixMilli(), rand.Intn(9999))
	fileName := fmt.Sprintf("info_%s%s", attachmentID, ext)

	dir := "./wwwroot/uploads/information"
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("erro ao criar diretorio")
	}

	dst, err := os.Create(filepath.Join(dir, fileName))
	if err != nil {
		return nil, fmt.Errorf("erro ao salvar arquivo")
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return nil, fmt.Errorf("erro ao gravar arquivo")
	}

	now := time.Now().UTC()
	return &models.InformationAttachment{
		ID:          attachmentID,
		Name:        header.Filename,
		URL:         fmt.Sprintf("/uploads/information/%s", fileName),
		ContentType: header.Header.Get("Content-Type"),
		Size:        header.Size,
		UploadedAt:  now,
	}, nil
}

func (h *InformationHandler) GetDashboard(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	startDate, err := parseFlexibleDate(c.Query("startDate"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "startDate invalido"})
		return
	}
	endDate, err := parseFlexibleDate(c.Query("endDate"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "endDate invalido"})
		return
	}

	demandDepartment := strings.TrimSpace(c.Query("department"))
	statusFilter := strings.TrimSpace(c.Query("status"))
	categoryFilter := strings.TrimSpace(c.Query("category"))
	priorityFilter := strings.TrimSpace(c.Query("priority"))
	approvalFilter := strings.TrimSpace(c.Query("approval"))

	db := h.db.WithContext(ctx)

	demandBase := db.Table("information_demands")
	demandBase = applyDateColumnRange(demandBase, "created_date", startDate, endDate)
	demandBase = applyExactFilter(demandBase, "requesting_department", demandDepartment)
	demandBase = applyExactFilter(demandBase, "status", statusFilter)
	demandBase = applyExactFilter(demandBase, "category", categoryFilter)
	demandBase = applyExactFilter(demandBase, "priority", priorityFilter)
	demandBase = applyExactFilter(demandBase, "approval", approvalFilter)

	countTable := func(base *gorm.DB, where string, args ...interface{}) int64 {
		query := base
		if strings.TrimSpace(where) != "" {
			query = query.Where(where, args...)
		}
		var total int64
		query.Count(&total)
		return total
	}

	sumFloat := func(base *gorm.DB, column string) float64 {
		var value float64
		base.Select("COALESCE(SUM(" + column + "), 0)").Scan(&value)
		return value
	}

	demandsReceived := countTable(demandBase, "")
	demandsCompleted := countTable(demandBase, "status = ? AND completed_date IS NOT NULL", "Concluido")
	demandsInProgress := countTable(demandBase, "status = ?", "Em andamento")
	demandsWaitingApproval := countTable(demandBase, "(status = ? OR approval = ?)", "Aguardando aprovacao", "Aguardando")
	projectsHours := sumFloat(demandBase, "hours_spent")

	trainingBase := db.Table("information_trainings")
	trainingBase = applyDateColumnRange(trainingBase, "date", startDate, endDate)
	trainingBase = applyExactFilter(trainingBase, "department", demandDepartment)
	approvalBase := db.Table("information_approvals")
	approvalBase = applyDateColumnRange(approvalBase, "date", startDate, endDate)
	approvalBase = applyExactFilter(approvalBase, "department", demandDepartment)
	meetingsBase := db.Table("information_meetings")
	meetingsBase = applyDateColumnRange(meetingsBase, "date", startDate, endDate)
	meetingsBase = applyExactFilter(meetingsBase, "department", demandDepartment)
	processBase := db.Table("information_processes")
	processBase = applyDateColumnRange(processBase, "date", startDate, endDate)
	processBase = applyExactFilter(processBase, "department", demandDepartment)
	supportBase := db.Table("information_department_support")
	supportBase = applyDateColumnRange(supportBase, "date", startDate, endDate)
	supportBase = applyExactFilter(supportBase, "department", demandDepartment)

	projectsHours += sumFloat(supportBase, "hours")
	trainingsHours := sumFloat(trainingBase, "hours")
	meetingsHours := sumFloat(meetingsBase, "duration_hours")
	processesCreated := countTable(processBase, "type = ?", "Novo")
	trainingsPerformed := countTable(trainingBase, "")

	departmentCounts := map[string]int64{}
	collectDepartments := func(column string, base *gorm.DB) {
		var values []string
		base.Select(column).Where(column + " <> ''").Find(&values)
		for _, value := range values {
			value = strings.TrimSpace(value)
			if value != "" {
				departmentCounts[value]++
			}
		}
	}

	var linkedPendingDemandIDs []string
	approvalBase.
		Where("status = ? AND demand_id IS NOT NULL AND demand_id <> ''", "Pendente").
		Pluck("DISTINCT demand_id", &linkedPendingDemandIDs)
	if len(linkedPendingDemandIDs) > 0 {
		var linkedPendingCount int64
		linkedDemandBase := h.demandRepo.Q(ctx)
		linkedDemandBase = applyDateColumnRange(linkedDemandBase, "created_date", startDate, endDate)
		linkedDemandBase = applyExactFilter(linkedDemandBase, "requesting_department", demandDepartment)
		linkedDemandBase = applyExactFilter(linkedDemandBase, "status", statusFilter)
		linkedDemandBase = applyExactFilter(linkedDemandBase, "category", categoryFilter)
		linkedDemandBase = applyExactFilter(linkedDemandBase, "priority", priorityFilter)
		linkedDemandBase = applyExactFilter(linkedDemandBase, "approval", approvalFilter)
		linkedDemandBase.
			Where("id IN ?", linkedPendingDemandIDs).
			Where("NOT (status = ? OR approval = ?)", "Aguardando aprovacao", "Aguardando").
			Count(&linkedPendingCount)
		demandsWaitingApproval += linkedPendingCount
	}

	collectDepartments("requesting_department", demandBase)
	collectDepartments("department", trainingBase)
	collectDepartments("department", processBase)
	collectDepartments("department", meetingsBase)
	collectDepartments("department", supportBase)

	type demandByDepartment struct {
		Department string `json:"department"`
		Count      int64  `json:"count"`
	}
	var demandsCompletedByDepartment []demandByDepartment
	demandBase.
		Where("status = ? AND completed_date IS NOT NULL", "Concluido").
		Where("requesting_department <> ''").
		Select("requesting_department as department, COUNT(*) as count").
		Group("requesting_department").
		Order("count DESC").
		Scan(&demandsCompletedByDepartment)

	departmentsAttendedBreakdown := make([]demandByDepartment, 0, len(departmentCounts))
	for department, count := range departmentCounts {
		departmentsAttendedBreakdown = append(departmentsAttendedBreakdown, demandByDepartment{Department: department, Count: count})
	}
	sort.Slice(departmentsAttendedBreakdown, func(i, j int) bool {
		if departmentsAttendedBreakdown[i].Count != departmentsAttendedBreakdown[j].Count {
			return departmentsAttendedBreakdown[i].Count > departmentsAttendedBreakdown[j].Count
		}
		return departmentsAttendedBreakdown[i].Department < departmentsAttendedBreakdown[j].Department
	})

	c.JSON(http.StatusOK, gin.H{
		"demandsReceived":              demandsReceived,
		"demandsCompleted":             demandsCompleted,
		"demandsInProgress":            demandsInProgress,
		"demandsWaitingApproval":       demandsWaitingApproval,
		"projectHours":                 projectsHours,
		"trainingHours":                trainingsHours,
		"meetingHours":                 meetingsHours,
		"processesCreated":             processesCreated,
		"trainingsPerformed":           trainingsPerformed,
		"departmentsAttendedBreakdown": departmentsAttendedBreakdown,
		"demandsCompletedByDepartment": demandsCompletedByDepartment,
	})
}

func (h *InformationHandler) GetDemands(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	startDate, err := parseFlexibleDate(c.Query("startDate"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "startDate invalido"})
		return
	}
	endDate, err := parseFlexibleDate(c.Query("endDate"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "endDate invalido"})
		return
	}

	page, pageSize := parsePagination(c, 20, 200)
	db := h.demandRepo.Q(ctx)
	db = applyDateColumnRange(db, "created_date", startDate, endDate)
	db = applyExactFilter(db, "requesting_department", c.Query("department"))
	db = applyExactFilter(db, "category", c.Query("category"))
	db = applyExactFilter(db, "priority", c.Query("priority"))
	db = applyExactFilter(db, "status", c.Query("status"))
	db = applyExactFilter(db, "approval", c.Query("approval"))

	if q := strings.TrimSpace(c.Query("q")); q != "" {
		db = db.Where("requester ILIKE ? OR description ILIKE ?", "%"+q+"%", "%"+q+"%")
	}

	items, total, totalPages, err := listPaginated[models.InformationDemand](db, page, pageSize, "created_date DESC, created_at DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": items, "page": page, "pageSize": pageSize, "total": total, "totalPages": totalPages})
}

func (h *InformationHandler) GetDemandByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	item, err := h.demandRepo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Demanda nao encontrada"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *InformationHandler) CreateDemand(c *gin.Context) {
	var item models.InformationDemand
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	normalizeDemand(&item)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.demandRepo.Create(ctx, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *InformationHandler) UpdateDemand(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	current, err := h.demandRepo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Demanda nao encontrada"})
		return
	}

	nextCreatedDate := current.CreatedDate
	if rawCreated, exists := payload["createdDate"]; exists {
		parsedCreated, err := parseOptionalJSONTime(rawCreated)
		if err != nil || parsedCreated == nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "createdDate invalida"})
			return
		}
		nextCreatedDate = *parsedCreated
	}

	nextCompletedDate := current.CompletedDate
	if status, ok := payload["status"].(string); ok && strings.EqualFold(strings.TrimSpace(status), "Concluido") {
		if _, exists := payload["completedDate"]; !exists && nextCompletedDate == nil {
			now := time.Now().UTC()
			payload["completedDate"] = now
			nextCompletedDate = &now
		}
	}
	if rawCompleted, exists := payload["completedDate"]; exists {
		parsedCompleted, err := parseOptionalJSONTime(rawCompleted)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "completedDate invalida"})
			return
		}
		nextCompletedDate = parsedCompleted
	}

	payload["hoursSpent"] = calculateInformationHours(nextCreatedDate, nextCompletedDate)

	if err := h.demandRepo.MergeUpdate(ctx, c.Param("id"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func (h *InformationHandler) DeleteDemand(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.demandRepo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

func (h *InformationHandler) GetApprovals(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	startDate, err := parseFlexibleDate(c.Query("startDate"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "startDate invalido"})
		return
	}
	endDate, err := parseFlexibleDate(c.Query("endDate"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "endDate invalido"})
		return
	}

	page, pageSize := parsePagination(c, 20, 200)
	db := h.approvalRepo.Q(ctx)
	db = applyDateColumnRange(db, "date", startDate, endDate)
	db = applyExactFilter(db, "department", c.Query("department"))
	db = applyExactFilter(db, "approver", c.Query("approver"))
	db = applyExactFilter(db, "status", c.Query("status"))

	items, total, totalPages, err := listPaginated[models.InformationApproval](db, page, pageSize, "date DESC, created_at DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	h.enrichApprovalDemands(ctx, items)

	c.JSON(http.StatusOK, gin.H{"items": items, "page": page, "pageSize": pageSize, "total": total, "totalPages": totalPages})
}

func (h *InformationHandler) GetApprovalByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	item, err := h.approvalRepo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Aprovacao nao encontrada"})
		return
	}
	if item != nil {
		h.enrichApprovalDemands(ctx, []models.InformationApproval{*item})
	}
	c.JSON(http.StatusOK, item)
}

func (h *InformationHandler) CreateApproval(c *gin.Context) {
	var item models.InformationApproval
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if item.Date.IsZero() {
		item.Date = time.Now().UTC()
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.approvalRepo.Create(ctx, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *InformationHandler) UpdateApproval(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.approvalRepo.MergeUpdate(ctx, c.Param("id"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func (h *InformationHandler) DeleteApproval(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.approvalRepo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

func (h *InformationHandler) GetTrainings(c *gin.Context) {
	listSimpleTimedResource(c, h.trainingRepo, "theme")
}

func (h *InformationHandler) GetTrainingByID(c *gin.Context) {
	getSimpleByID(c, h.trainingRepo, "Treinamento nao encontrado")
}

func (h *InformationHandler) CreateTraining(c *gin.Context) {
	createSimpleResource(c, h.trainingRepo, normalizeTraining)
}

func (h *InformationHandler) UploadAttachment(c *gin.Context) {
	attachment, err := uploadInformationAttachment(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, attachment)
}

func (h *InformationHandler) UpdateTraining(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")

	if rawModules, ok := payload["modulesCovered"].(string); ok {
		payload["modulesCovered"] = strings.TrimSpace(rawModules)
	}

	if rawNames, ok := payload["participantNames"].(string); ok {
		names := strings.TrimSpace(rawNames)
		payload["participantNames"] = names
		payload["trainedCount"] = len(splitTrainingParticipantNames(names))
	}
	if rawCount, ok := payload["trainedCount"]; ok {
		if _, hasNames := payload["participantNames"]; hasNames {
			rawCount = nil
		}
		switch value := rawCount.(type) {
		case nil:
		case float64:
			if value < 0 {
				payload["trainedCount"] = 0
			}
		case int:
			if value < 0 {
				payload["trainedCount"] = 0
			}
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.trainingRepo.MergeUpdate(ctx, c.Param("id"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func (h *InformationHandler) DeleteTraining(c *gin.Context) {
	deleteSimpleResource(c, h.trainingRepo)
}

func (h *InformationHandler) GetInformationProcesses(c *gin.Context) {
	listSimpleTimedResource(c, h.processRepo, "process_name")
}

func (h *InformationHandler) GetInformationProcessByID(c *gin.Context) {
	getSimpleByID(c, h.processRepo, "Processo nao encontrado")
}

func (h *InformationHandler) CreateInformationProcess(c *gin.Context) {
	createSimpleResource(c, h.processRepo, func(item *models.InformationProcess) {
		if item.Date.IsZero() {
			item.Date = time.Now().UTC()
		}
	})
}

func (h *InformationHandler) UpdateInformationProcess(c *gin.Context) {
	updateSimpleResource(c, h.processRepo)
}

func (h *InformationHandler) DeleteInformationProcess(c *gin.Context) {
	deleteSimpleResource(c, h.processRepo)
}

func (h *InformationHandler) GetDailyRoutines(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	startDate, err := parseFlexibleDate(c.Query("startDate"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "startDate invalido"})
		return
	}
	endDate, err := parseFlexibleDate(c.Query("endDate"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "endDate invalido"})
		return
	}

	page, pageSize := parsePagination(c, 20, 200)
	db := h.routineRepo.Q(ctx)
	db = applyDateColumnRange(db, "date", startDate, endDate)
	db = applyTextFilter(db, "activity", c.Query("activity"))
	db = applyExactFilter(db, "status", c.Query("status"))

	items, total, totalPages, err := listPaginated[models.InformationDailyRoutine](db, page, pageSize, "date DESC, created_at DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	var totalMinutes int64
	db.Select("COALESCE(SUM(duration_minutes), 0)").Scan(&totalMinutes)
	c.JSON(http.StatusOK, gin.H{
		"items": items, "page": page, "pageSize": pageSize,
		"total": total, "totalPages": totalPages,
		"totalMinutes": totalMinutes,
	})
}

func (h *InformationHandler) GetDailyRoutineByID(c *gin.Context) {
	getSimpleByID(c, h.routineRepo, "Rotina nao encontrada")
}

func (h *InformationHandler) CreateDailyRoutine(c *gin.Context) {
	createSimpleResource(c, h.routineRepo, normalizeRoutine)
}

func (h *InformationHandler) UpdateDailyRoutine(c *gin.Context) {
	updateSimpleResource(c, h.routineRepo)
}

func (h *InformationHandler) DeleteDailyRoutine(c *gin.Context) {
	deleteSimpleResource(c, h.routineRepo)
}

func (h *InformationHandler) GetMeetings(c *gin.Context) {
	listSimpleTimedResource(c, h.meetingRepo, "subject")
}

func (h *InformationHandler) GetMeetingByID(c *gin.Context) {
	getSimpleByID(c, h.meetingRepo, "Reuniao nao encontrada")
}

func (h *InformationHandler) CreateMeeting(c *gin.Context) {
	createSimpleResource(c, h.meetingRepo, func(item *models.InformationMeeting) {
		if item.Date.IsZero() {
			item.Date = time.Now().UTC()
		}
	})
}

func (h *InformationHandler) UpdateMeeting(c *gin.Context) {
	updateSimpleResource(c, h.meetingRepo)
}

func (h *InformationHandler) DeleteMeeting(c *gin.Context) {
	deleteSimpleResource(c, h.meetingRepo)
}

func (h *InformationHandler) GetDepartmentSupport(c *gin.Context) {
	listSimpleTimedResource(c, h.supportRepo, "support_provided")
}

func (h *InformationHandler) GetDepartmentSupportByID(c *gin.Context) {
	getSimpleByID(c, h.supportRepo, "Apoio nao encontrado")
}

func (h *InformationHandler) CreateDepartmentSupport(c *gin.Context) {
	createSimpleResource(c, h.supportRepo, func(item *models.InformationDepartmentSupport) {
		if item.Date.IsZero() {
			item.Date = time.Now().UTC()
		}
	})
}

func (h *InformationHandler) UpdateDepartmentSupport(c *gin.Context) {
	updateSimpleResource(c, h.supportRepo)
}

func (h *InformationHandler) DeleteDepartmentSupport(c *gin.Context) {
	deleteSimpleResource(c, h.supportRepo)
}

func (h *InformationHandler) GetPositions(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var items []models.InformationPosition
	// Ordem de exibicao (nao alfabetica): comeca na ordem de cadastro e pode
	// ser alterada pelo usuario (ReorderPositions). "created_at ASC" e so um
	// desempate pra cargos antigos que ainda estao todos com order_index 0.
	q := h.positionRepo.Q(ctx).Order("order_index ASC, created_at ASC")
	if orgChartID := strings.TrimSpace(c.Query("orgChartId")); orgChartID != "" {
		q = q.Where("org_chart_id = ?", orgChartID)
	}
	if err := q.Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *InformationHandler) GetPositionByID(c *gin.Context) {
	getSimpleByID(c, h.positionRepo, "Cargo nao encontrado")
}

func (h *InformationHandler) CreatePosition(c *gin.Context) {
	var item models.InformationPosition
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if item.OrgChartID == nil || strings.TrimSpace(*item.OrgChartID) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Organograma obrigatorio"})
		return
	}
	if item.ParentID != nil && strings.TrimSpace(*item.ParentID) == "" {
		item.ParentID = nil
	}
	if item.ParentID2 != nil && strings.TrimSpace(*item.ParentID2) == "" {
		item.ParentID2 = nil
	}
	if item.ParentID3 != nil && strings.TrimSpace(*item.ParentID3) == "" {
		item.ParentID3 = nil
	}
	if item.DepartmentID != nil && strings.TrimSpace(*item.DepartmentID) == "" {
		item.DepartmentID = nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var count int64
	if err := h.positionRepo.Q(ctx).Where("org_chart_id = ?", *item.OrgChartID).Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	item.OrderIndex = int(count)
	if err := h.positionRepo.Create(ctx, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *InformationHandler) UpdatePosition(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")
	// Cargo nao pode trocar de organograma por essa rota generica.
	delete(payload, "orgChartId")
	id := c.Param("id")
	for _, key := range []string{"parentId", "parentId2", "parentId3"} {
		value, ok := payload[key]
		if !ok {
			continue
		}
		valueStr, isString := value.(string)
		if !isString {
			continue
		}
		if strings.TrimSpace(valueStr) == "" {
			payload[key] = nil
		} else if valueStr == id {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Um cargo nao pode ser superior de si mesmo"})
			return
		}
	}
	if departmentID, ok := payload["departmentId"]; ok {
		if departmentStr, isString := departmentID.(string); isString && strings.TrimSpace(departmentStr) == "" {
			payload["departmentId"] = nil
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.positionRepo.MergeUpdate(ctx, id, payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func (h *InformationHandler) DeletePosition(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	id := c.Param("id")
	if err := h.positionRepo.Q(ctx).Where("parent_id = ?", id).Update("parent_id", nil).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	if err := h.positionRepo.Q(ctx).Where("parent_id_2 = ?", id).Update("parent_id_2", nil).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	if err := h.positionRepo.Q(ctx).Where("parent_id_3 = ?", id).Update("parent_id_3", nil).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	if err := h.positionRepo.Delete(ctx, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

// ReorderPositions recebe a lista de ids na ordem desejada e grava o indice
// de cada um como order_index — usado pra "arrastar"/mover cargos na lista e
// no organograma (que respeita essa ordem, e nao mais a ordem alfabetica).
func (h *InformationHandler) ReorderPositions(c *gin.Context) {
	var payload struct {
		Order []string `json:"order"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	for index, id := range payload.Order {
		if err := h.positionRepo.Q(ctx).Where("id = ?", id).Update("order_index", index).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"message": "Reordenado"})
}

func (h *InformationHandler) GetOrgDepartments(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var items []models.InformationOrgDepartment
	q := h.orgDepartmentRepo.Q(ctx).Order("order_index ASC, name ASC")
	if orgChartID := strings.TrimSpace(c.Query("orgChartId")); orgChartID != "" {
		q = q.Where("org_chart_id = ?", orgChartID)
	}
	if err := q.Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *InformationHandler) GetOrgDepartmentByID(c *gin.Context) {
	getSimpleByID(c, h.orgDepartmentRepo, "Departamento nao encontrado")
}

func (h *InformationHandler) CreateOrgDepartment(c *gin.Context) {
	var item models.InformationOrgDepartment
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if item.OrgChartID == nil || strings.TrimSpace(*item.OrgChartID) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Organograma obrigatorio"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var count int64
	if err := h.orgDepartmentRepo.Q(ctx).Where("org_chart_id = ?", *item.OrgChartID).Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	item.OrderIndex = int(count)
	if err := h.orgDepartmentRepo.Create(ctx, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *InformationHandler) UpdateOrgDepartment(c *gin.Context) {
	updateSimpleResource(c, h.orgDepartmentRepo)
}

func (h *InformationHandler) DeleteOrgDepartment(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	id := c.Param("id")
	if err := h.positionRepo.Q(ctx).Where("department_id = ?", id).Update("department_id", nil).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	if err := h.orgDepartmentRepo.Delete(ctx, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

func (h *InformationHandler) ReorderOrgDepartments(c *gin.Context) {
	var payload struct {
		Order []string `json:"order"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	for index, id := range payload.Order {
		if err := h.orgDepartmentRepo.Q(ctx).Where("id = ?", id).Update("order_index", index).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"message": "Reordenado"})
}

func (h *InformationHandler) GetOrgCharts(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var items []models.InformationOrgChart
	if err := h.orgChartRepo.Q(ctx).Order("order_index ASC, name ASC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *InformationHandler) GetOrgChartByID(c *gin.Context) {
	getSimpleByID(c, h.orgChartRepo, "Organograma nao encontrado")
}

func (h *InformationHandler) CreateOrgChart(c *gin.Context) {
	var item models.InformationOrgChart
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if strings.TrimSpace(item.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Nome obrigatorio"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var count int64
	if err := h.orgChartRepo.Q(ctx).Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	item.OrderIndex = int(count)
	if err := h.orgChartRepo.Create(ctx, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *InformationHandler) UpdateOrgChart(c *gin.Context) {
	updateSimpleResource(c, h.orgChartRepo)
}

// DeleteOrgChart apaga o organograma e, em cascata, todos os cargos e areas
// vinculados a ele (senao ficariam orfaos, apontando pra um org_chart_id
// inexistente).
func (h *InformationHandler) DeleteOrgChart(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	id := c.Param("id")
	if err := h.positionRepo.Q(ctx).Where("org_chart_id = ?", id).Delete(&models.InformationPosition{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	if err := h.orgDepartmentRepo.Q(ctx).Where("org_chart_id = ?", id).Delete(&models.InformationOrgDepartment{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	if err := h.orgChartRepo.Delete(ctx, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

func (h *InformationHandler) GetChecklist(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	weekStart, err := parseChecklistWeekStart(c.Query("weekStart"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "weekStart invalido"})
		return
	}
	if err := h.ensureChecklistWeek(ctx, weekStart); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	var templates []models.InformationChecklistTemplate
	if err := h.checklistTemplateRepo.Q(ctx).Order("order_index ASC, created_at ASC").Find(&templates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	var entries []models.InformationDailyChecklist
	if err := h.checklistEntryRepo.Q(ctx).Where("week_start = ?", weekStart).Order("created_at ASC").Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	entryByTemplate := make(map[string]models.InformationDailyChecklist, len(entries))
	for _, entry := range entries {
		entryByTemplate[entry.TemplateID] = entry
	}

	items := make([]gin.H, 0, len(templates))
	completed := 0
	totalSlots := len(templates) * 5

	for _, template := range templates {
		entry := entryByTemplate[template.ID]
		if entry.Monday {
			completed++
		}
		if entry.Tuesday {
			completed++
		}
		if entry.Wednesday {
			completed++
		}
		if entry.Thursday {
			completed++
		}
		if entry.Friday {
			completed++
		}

		items = append(items, gin.H{
			"id":         entry.ID,
			"templateId": template.ID,
			"activity":   template.Activity,
			"orderIndex": template.OrderIndex,
			"weekStart":  weekStart,
			"monday":     entry.Monday,
			"tuesday":    entry.Tuesday,
			"wednesday":  entry.Wednesday,
			"thursday":   entry.Thursday,
			"friday":     entry.Friday,
		})
	}

	percentage := 0.0
	if totalSlots > 0 {
		percentage = (float64(completed) / float64(totalSlots)) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"weekStart":            weekStart,
		"items":                items,
		"completionPercentage": percentage,
	})
}

func (h *InformationHandler) CreateChecklistTemplate(c *gin.Context) {
	var item models.InformationChecklistTemplate
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	item.Activity = strings.TrimSpace(item.Activity)
	if item.Activity == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "activity obrigatoria"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if item.OrderIndex == 0 {
		var maxOrder int
		h.checklistTemplateRepo.Q(ctx).Select("COALESCE(MAX(order_index), 0)").Scan(&maxOrder)
		item.OrderIndex = maxOrder + 1
	}

	if err := h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		templateRepo := repositories.New[models.InformationChecklistTemplate](tx, "information_checklist_templates")
		entryRepo := repositories.New[models.InformationDailyChecklist](tx, "information_daily_checklist")
		if err := templateRepo.Create(ctx, &item); err != nil {
			return err
		}

		var existingWeeks []time.Time
		if err := entryRepo.Q(ctx).Distinct("week_start").Order("week_start DESC").Limit(26).Find(&existingWeeks).Error; err != nil {
			return err
		}

		for _, weekStart := range existingWeeks {
			entry := models.InformationDailyChecklist{
				TemplateID: item.ID,
				WeekStart:  weekStart,
			}
			if err := entryRepo.Create(ctx, &entry); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func (h *InformationHandler) UpdateChecklistTemplate(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.checklistTemplateRepo.MergeUpdate(ctx, c.Param("id"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func (h *InformationHandler) DeleteChecklistTemplate(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Table("information_daily_checklist").Where("template_id = ?", c.Param("id")).Delete(&models.InformationDailyChecklist{}).Error; err != nil {
			return err
		}
		return tx.Table("information_checklist_templates").Where("id = ?", c.Param("id")).Delete(&models.InformationChecklistTemplate{}).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

func (h *InformationHandler) UpdateChecklistEntry(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")
	delete(payload, "templateId")
	delete(payload, "activity")
	delete(payload, "weekStart")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.checklistEntryRepo.MergeUpdate(ctx, c.Param("id"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func listSimpleTimedResource[T any](c *gin.Context, repo *repositories.Repository[T], searchColumn string) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	startDate, err := parseFlexibleDate(c.Query("startDate"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "startDate invalido"})
		return
	}
	endDate, err := parseFlexibleDate(c.Query("endDate"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "endDate invalido"})
		return
	}

	page, pageSize := parsePagination(c, 20, 200)
	db := repo.Q(ctx)
	db = applyDateColumnRange(db, "date", startDate, endDate)
	db = applyExactFilter(db, "department", c.Query("department"))
	db = applyExactFilter(db, "type", c.Query("type"))
	db = applyExactFilter(db, "status", c.Query("status"))
	db = applyTextFilter(db, searchColumn, c.Query("q"))
	db = applyTextFilter(db, searchColumn, c.Query(searchColumn))

	items, total, totalPages, err := listPaginated[T](db, page, pageSize, "date DESC, created_at DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "page": page, "pageSize": pageSize, "total": total, "totalPages": totalPages})
}

func getSimpleByID[T any](c *gin.Context, repo *repositories.Repository[T], notFoundMessage string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	item, err := repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": notFoundMessage})
		return
	}
	c.JSON(http.StatusOK, item)
}

func createSimpleResource[T any](c *gin.Context, repo *repositories.Repository[T], normalize func(*T)) {
	var item T
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if normalize != nil {
		normalize(&item)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := repo.Create(ctx, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func updateSimpleResource[T any](c *gin.Context, repo *repositories.Repository[T]) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := repo.MergeUpdate(ctx, c.Param("id"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func deleteSimpleResource[T any](c *gin.Context, repo *repositories.Repository[T]) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := repo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

func parseChecklistWeekStart(value string) (time.Time, error) {
	if strings.TrimSpace(value) == "" {
		return startOfWeekUTC(time.Now().UTC()), nil
	}

	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Time{}, err
	}
	return startOfWeekUTC(parsed.UTC()), nil
}

func startOfWeekUTC(input time.Time) time.Time {
	day := input.Weekday()
	offset := (int(day) + 6) % 7
	value := time.Date(input.Year(), input.Month(), input.Day(), 0, 0, 0, 0, time.UTC)
	return value.AddDate(0, 0, -offset)
}

func (h *InformationHandler) ensureChecklistWeek(ctx context.Context, weekStart time.Time) error {
	return h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		templateRepo := repositories.New[models.InformationChecklistTemplate](tx, "information_checklist_templates")
		entryRepo := repositories.New[models.InformationDailyChecklist](tx, "information_daily_checklist")

		var templateCount int64
		if err := templateRepo.Q(ctx).Count(&templateCount).Error; err != nil {
			return err
		}
		if templateCount == 0 {
			for index, activity := range defaultInformationChecklistActivities {
				template := models.InformationChecklistTemplate{
					Activity:   activity,
					OrderIndex: index + 1,
				}
				if err := templateRepo.Create(ctx, &template); err != nil {
					return err
				}
			}
		}

		var templates []models.InformationChecklistTemplate
		if err := templateRepo.Q(ctx).Order("order_index ASC, created_at ASC").Find(&templates).Error; err != nil {
			return err
		}

		var entries []models.InformationDailyChecklist
		if err := entryRepo.Q(ctx).Where("week_start = ?", weekStart).Find(&entries).Error; err != nil {
			return err
		}

		entryByTemplate := make(map[string]struct{}, len(entries))
		for _, entry := range entries {
			entryByTemplate[entry.TemplateID] = struct{}{}
		}

		for _, template := range templates {
			if _, ok := entryByTemplate[template.ID]; ok {
				continue
			}
			entry := models.InformationDailyChecklist{
				TemplateID: template.ID,
				WeekStart:  weekStart,
			}
			if err := entryRepo.Create(ctx, &entry); err != nil {
				return err
			}
		}

		return nil
	})
}

func (h *InformationHandler) enrichApprovalDemands(ctx context.Context, approvals []models.InformationApproval) {
	demandIDs := make([]string, 0)
	seen := map[string]struct{}{}
	for _, approval := range approvals {
		if approval.DemandID == nil || strings.TrimSpace(*approval.DemandID) == "" {
			continue
		}
		id := strings.TrimSpace(*approval.DemandID)
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		demandIDs = append(demandIDs, id)
	}
	if len(demandIDs) == 0 {
		return
	}

	var demands []models.InformationDemand
	if err := h.demandRepo.Q(ctx).Where("id IN ?", demandIDs).Find(&demands).Error; err != nil {
		return
	}

	demandMap := make(map[string]models.InformationDemand, len(demands))
	for _, demand := range demands {
		demandMap[demand.ID] = demand
	}

	for index := range approvals {
		if approvals[index].DemandID == nil {
			continue
		}
		demand, ok := demandMap[strings.TrimSpace(*approvals[index].DemandID)]
		if !ok {
			continue
		}
		approvals[index].Demand = &models.ReferenceEntity{
			ID:   demand.ID,
			Name: demand.Description,
		}
	}
}

func sortedChecklistWeeks(entries []models.InformationDailyChecklist) []time.Time {
	weeks := make([]time.Time, 0, len(entries))
	seen := map[string]struct{}{}
	for _, entry := range entries {
		key := entry.WeekStart.Format("2006-01-02")
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		weeks = append(weeks, entry.WeekStart)
	}
	sort.Slice(weeks, func(i, j int) bool { return weeks[i].Before(weeks[j]) })
	return weeks
}
