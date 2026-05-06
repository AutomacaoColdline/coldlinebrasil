package handlers

import (
	"context"
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"
	"coldline-api/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ProcessHandler struct {
	db                *gorm.DB
	repo              *repositories.Repository[models.Process]
	userRepo          *repositories.Repository[models.User]
	machineRepo       *repositories.Repository[models.Machine]
	ptypeRepo         *repositories.Repository[models.BaseEntity]
	occurrenceRepo    *repositories.Repository[models.Occurrence]
	occurrenceTypeRepo *repositories.Repository[models.BaseEntity]
}

func NewProcessHandler(db *gorm.DB) *ProcessHandler {
	return &ProcessHandler{
		db:                 db,
		repo:               repositories.New[models.Process](db, "processes"),
		userRepo:           repositories.New[models.User](db, "users"),
		machineRepo:        repositories.New[models.Machine](db, "machines"),
		ptypeRepo:          repositories.New[models.BaseEntity](db, "process_types"),
		occurrenceRepo:     repositories.New[models.Occurrence](db, "occurrences"),
		occurrenceTypeRepo: repositories.New[models.BaseEntity](db, "occurrence_types"),
	}
}

func (h *ProcessHandler) GetAll(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = RepairStuckProcessOccurrenceState(ctx, h.db)

	db := h.repo.Q(ctx)
	if f := c.Query("finished"); f != "" {
		db = db.Where("finished = ?", f == "true")
	}
	var processes []models.Process
	if err := db.Find(&processes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	EnrichProcessesOperatorOccurrence(ctx, h.db, processes)
	c.JSON(http.StatusOK, processes)
}

func (h *ProcessHandler) GetByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	process, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Processo não encontrado"})
		return
	}
	c.JSON(http.StatusOK, process)
}

func (h *ProcessHandler) Create(c *gin.Context) {
	var process models.Process
	if err := c.ShouldBindJSON(&process); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if process.IdentificationNumber == "" {
		process.IdentificationNumber = generateNumericCode()
	}
	if process.StartDate.IsZero() {
		process.StartDate = time.Now().UTC()
	}
	if process.Occurrences == nil {
		process.Occurrences = []models.ReferenceEntity{}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if process.User != nil && process.User.ID != "" {
		var activeCount int64
		h.repo.Q(ctx).Where("user_ref->>'id' = ? AND finished = ? AND in_occurrence = ?", process.User.ID, false, false).Count(&activeCount)
		if activeCount > 0 {
			c.JSON(http.StatusConflict, gin.H{"message": "Usuário já possui um processo em andamento. Pause-o antes de iniciar outro."})
			return
		}
	}

	if err := h.repo.Create(ctx, &process); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	if process.User != nil && process.User.ID != "" {
		if u, err := h.userRepo.FindByID(ctx, process.User.ID); err == nil {
			u.CurrentProcess = &models.ReferenceEntity{ID: process.ID, Name: process.IdentificationNumber}
			h.userRepo.Save(ctx, u)
		}
	}
	if process.Machine != nil && process.Machine.ID != "" {
		if m, err := h.machineRepo.FindByID(ctx, process.Machine.ID); err == nil {
			SyncMachineStatusForMachine(ctx, h.repo, h.machineRepo, m)
		}
	}

	c.JSON(http.StatusCreated, process)
}

func (h *ProcessHandler) Update(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := h.repo.MergeUpdate(ctx, c.Param("id"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func (h *ProcessHandler) Delete(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

func (h *ProcessHandler) StartProcess(c *gin.Context) {
	var req models.StartProcessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	user, err := h.userRepo.FindOne(ctx, "identification_number = ?", req.IdentificationNumber)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Usuário não encontrado"})
		return
	}

	var activeCount int64
	h.repo.Q(ctx).Where("user_ref->>'id' = ? AND finished = ? AND in_occurrence = ?", user.ID, false, false).Count(&activeCount)
	if activeCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"message": "Usuário já possui um processo em andamento. Pause-o antes de iniciar outro."})
		return
	}

	processType, err := h.ptypeRepo.FindByID(ctx, req.ProcessTypeId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Tipo de processo não encontrado"})
		return
	}

	process := &models.Process{
		IdentificationNumber: generateNumericCode(),
		StartDate:            time.Now().UTC(),
		User:                 &models.ReferenceEntity{ID: user.ID, Name: user.Name},
		Department:           user.Department,
		ProcessType:          &models.ReferenceEntity{ID: processType.ID, Name: processType.Name},
		PreIndustrialization: req.PreIndustrialization,
		ReWork:               req.ReWork,
		Prototype:            req.Prototype,
		Finished:             false,
		InOccurrence:         false,
		Occurrences:          []models.ReferenceEntity{},
	}

	if req.MachineId != "" {
		if machine, err := h.machineRepo.FindByID(ctx, req.MachineId); err == nil && machine != nil {
			machName := machine.IdentificationNumber
			if machName == "" { machName = machine.CustomerName }
			process.Machine = &models.ReferenceEntity{ID: machine.ID, Name: machName}
		}
	}

	if err := h.repo.Create(ctx, process); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	if process.Machine != nil && process.Machine.ID != "" {
		if m, err := h.machineRepo.FindByID(ctx, process.Machine.ID); err == nil {
			SyncMachineStatusForMachine(ctx, h.repo, h.machineRepo, m)
		}
	}

	user.CurrentProcess = &models.ReferenceEntity{ID: process.ID, Name: process.IdentificationNumber}
	h.userRepo.Save(ctx, user)

	c.JSON(http.StatusCreated, process)
}

func (h *ProcessHandler) EndProcess(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	process, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Processo não encontrado"})
		return
	}

	now := time.Now().UTC()
	workSecs := utils.WorkingSeconds(process.StartDate, now) - process.TotalOccurrenceSeconds
	if workSecs < 0 {
		workSecs = 0
	}
	processTime := utils.FormatSeconds(workSecs)

	process.Finished = true
	process.EndDate = &now
	process.ProcessTime = processTime
	h.repo.Save(ctx, process)

	if process.User != nil && process.User.ID != "" {
		if u, err := h.userRepo.FindByID(ctx, process.User.ID); err == nil {
			u.CurrentProcess = nil
			h.userRepo.Save(ctx, u)
		}
	}
	if process.Machine != nil && process.Machine.ID != "" {
		if m, err := h.machineRepo.FindByID(ctx, process.Machine.ID); err == nil {
			SyncMachineStatusForMachine(ctx, h.repo, h.machineRepo, m)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Processo finalizado", "processTime": processTime})
}

func (h *ProcessHandler) GetStats(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	count := func(where string, args ...interface{}) int64 {
		var n int64
		h.repo.Q(ctx).Where(where, args...).Count(&n)
		return n
	}
	c.JSON(http.StatusOK, gin.H{
		"total":        count("1=1"),
		"active":       count("finished = ?", false),
		"finished":     count("finished = ?", true),
		"inOccurrence": count("in_occurrence = ?", true),
	})
}

func (h *ProcessHandler) MachineCycleReport(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	type row struct {
		MachineID   string     `json:"machineId"`
		MachineName string     `json:"machineName"`
		CreatedAt   time.Time  `json:"createdAt"`
		FinishedAt  *time.Time `json:"finishedAt"`
		CycleDays   *float64   `json:"cycleDays"`
	}
	var rows []row
	err := h.db.WithContext(ctx).Raw(`
		SELECT
			m.id AS machine_id,
			COALESCE(NULLIF(m.identification_number, ''), NULLIF(m.customer_name, ''), m.id) AS machine_name,
			m.created_at AS created_at,
			p.last_end_date AS finished_at,
			CASE
				WHEN p.last_end_date IS NULL THEN NULL
				ELSE EXTRACT(EPOCH FROM (p.last_end_date - m.created_at)) / 86400.0
			END AS cycle_days
		FROM machines m
		LEFT JOIN LATERAL (
			SELECT MAX(pr.end_date) AS last_end_date
			FROM processes pr
			WHERE pr.finished = TRUE
			  AND (
				pr.machine_ref->>'id' = m.id
				OR (m.identification_number <> '' AND (pr.machine_ref->>'id' = m.identification_number OR pr.machine_ref->>'name' = m.identification_number))
			  )
		) p ON TRUE
		ORDER BY m.created_at DESC
	`).Scan(&rows).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

func (h *ProcessHandler) MachineTotalHoursReport(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	type row struct {
		MachineID     string  `json:"machineId"`
		MachineName   string  `json:"machineName"`
		ProcessCount  int64   `json:"processCount"`
		TotalHours    float64 `json:"totalHours"`
		TotalSeconds  float64 `json:"totalSeconds"`
		AverageHours  float64 `json:"averageHours"`
		AverageSecond float64 `json:"averageSeconds"`
	}
	var rows []row
	err := h.db.WithContext(ctx).Raw(`
		SELECT
			m.id AS machine_id,
			COALESCE(NULLIF(m.identification_number, ''), NULLIF(m.customer_name, ''), m.id) AS machine_name,
			COUNT(pr.id) AS process_count,
			COALESCE(SUM(EXTRACT(EPOCH FROM (pr.end_date - pr.start_date))), 0) AS total_seconds,
			COALESCE(SUM(EXTRACT(EPOCH FROM (pr.end_date - pr.start_date))) / 3600.0, 0) AS total_hours,
			COALESCE(AVG(EXTRACT(EPOCH FROM (pr.end_date - pr.start_date))), 0) AS average_seconds,
			COALESCE(AVG(EXTRACT(EPOCH FROM (pr.end_date - pr.start_date))) / 3600.0, 0) AS average_hours
		FROM machines m
		LEFT JOIN processes pr
			ON pr.start_date IS NOT NULL
		   AND pr.end_date IS NOT NULL
		   AND (
				pr.machine_ref->>'id' = m.id
				OR (m.identification_number <> '' AND (pr.machine_ref->>'id' = m.identification_number OR pr.machine_ref->>'name' = m.identification_number))
		   )
		GROUP BY m.id, m.identification_number, m.customer_name
		ORDER BY total_seconds DESC, machine_name ASC
	`).Scan(&rows).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

func (h *ProcessHandler) MachinePeriodReport(c *gin.Context) {
	startPeriod, endPeriod, err := parsePeriodRange(c.Query("startPeriod"), c.Query("endPeriod"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	type procRow struct {
		MachineID      string    `json:"machineId"`
		ProcessID      string    `json:"processId"`
		Code           string    `json:"identificationNumber"`
		StartDate      time.Time `json:"startDate"`
		EndDate        time.Time `json:"endDate"`
		OverlapSeconds float64   `json:"overlapSeconds"`
	}
	var procRows []procRow
	if err := h.db.WithContext(ctx).Raw(`
		SELECT
			m.id AS machine_id,
			pr.id AS process_id,
			pr.identification_number AS code,
			pr.start_date AS start_date,
			COALESCE(pr.end_date, NOW() AT TIME ZONE 'utc') AS end_date,
			EXTRACT(EPOCH FROM (
				LEAST(COALESCE(pr.end_date, NOW() AT TIME ZONE 'utc'), ?) -
				GREATEST(pr.start_date, ?)
			)) AS overlap_seconds
		FROM machines m
		JOIN processes pr
		  ON (
				pr.machine_ref->>'id' = m.id
				OR (m.identification_number <> '' AND (pr.machine_ref->>'id' = m.identification_number OR pr.machine_ref->>'name' = m.identification_number))
		  )
		WHERE pr.start_date IS NOT NULL
		  AND COALESCE(pr.end_date, NOW() AT TIME ZONE 'utc') > ?
		  AND pr.start_date < ?
		ORDER BY m.id, pr.start_date ASC
	`, endPeriod, startPeriod, startPeriod, endPeriod).Scan(&procRows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	type processItem struct {
		ID                 string    `json:"id"`
		IdentificationCode string    `json:"identificationNumber"`
		StartDate          time.Time `json:"startDate"`
		EndDate            time.Time `json:"endDate"`
		Hours              float64   `json:"hours"`
		Seconds            float64   `json:"seconds"`
	}
	type machineRow struct {
		ID         string        `json:"id"`
		Name       string        `json:"name"`
		Processes  []processItem `json:"processes"`
		TotalHours float64       `json:"totalHours"`
	}
	itemsByMachine := map[string]*machineRow{}
	for _, r := range procRows {
		if r.OverlapSeconds <= 0 {
			continue
		}
		m, ok := itemsByMachine[r.MachineID]
		if !ok {
			// Resolve nome legível apenas uma vez por máquina.
			var machine models.Machine
			if err := h.machineRepo.Q(ctx).Where("id = ?", r.MachineID).First(&machine).Error; err == nil {
				name := strings.TrimSpace(machine.IdentificationNumber)
				if name == "" {
					name = strings.TrimSpace(machine.CustomerName)
				}
				if name == "" {
					name = machine.ID
				}
				m = &machineRow{ID: machine.ID, Name: name, Processes: []processItem{}}
			} else {
				m = &machineRow{ID: r.MachineID, Name: r.MachineID, Processes: []processItem{}}
			}
			itemsByMachine[r.MachineID] = m
		}
		hours := r.OverlapSeconds / 3600.0
		m.Processes = append(m.Processes, processItem{
			ID:                 r.ProcessID,
			IdentificationCode: r.Code,
			StartDate:          r.StartDate,
			EndDate:            r.EndDate,
			Hours:              hours,
			Seconds:            r.OverlapSeconds,
		})
		m.TotalHours += hours
	}

	items := make([]machineRow, 0, len(itemsByMachine))
	for _, it := range itemsByMachine {
		items = append(items, *it)
	}
	c.JSON(http.StatusOK, gin.H{
		"startPeriod": startPeriod.UTC(),
		"endPeriod":   endPeriod.UTC(),
		"items":       items,
	})
}

func parsePeriodRange(startRaw, endRaw string) (time.Time, time.Time, error) {
	if strings.TrimSpace(startRaw) == "" || strings.TrimSpace(endRaw) == "" {
		return time.Time{}, time.Time{}, fmt.Errorf("startPeriod e endPeriod são obrigatórios")
	}
	startPeriod, err := time.Parse(time.RFC3339, startRaw)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("startPeriod inválido: use RFC3339")
	}
	endPeriod, err := time.Parse(time.RFC3339, endRaw)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("endPeriod inválido: use RFC3339")
	}
	if !endPeriod.After(startPeriod) {
		return time.Time{}, time.Time{}, fmt.Errorf("endPeriod deve ser maior que startPeriod")
	}
	return startPeriod.UTC(), endPeriod.UTC(), nil
}

func overlapSeconds(startA, endA, startB, endB time.Time) float64 {
	left := startA
	if startB.After(left) {
		left = startB
	}
	right := endA
	if endB.Before(right) {
		right = endB
	}
	if !right.After(left) {
		return 0
	}
	return right.Sub(left).Seconds()
}

func (h *ProcessHandler) GetProcessTypeStats(c *gin.Context) {
	processTypeId := c.Param("processTypeId")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var processes []models.Process
	h.repo.Q(ctx).
		Where("finished = ? AND (process_type->>'id' = ? OR process_type->>'name' = ?)",
			true, processTypeId, processTypeId).
		Find(&processes)

	var times []float64
	for _, p := range processes {
		if secs := parseTimeToSeconds(p.ProcessTime); secs > 0 {
			times = append(times, secs)
		}
	}

	if len(times) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"count": 0, "averageSeconds": 0, "stdDevSeconds": 0,
			"upperLimitSeconds": 0, "averageFormatted": "—", "upperLimitFormatted": "—",
		})
		return
	}

	var sum float64
	for _, t := range times { sum += t }
	mean := sum / float64(len(times))

	var variance float64
	for _, t := range times { d := t - mean; variance += d * d }
	variance /= float64(len(times))
	stdDev := math.Sqrt(variance)
	upperLimit := mean + 3*stdDev

	c.JSON(http.StatusOK, gin.H{
		"count":               len(times),
		"averageSeconds":      int(mean),
		"stdDevSeconds":       int(stdDev),
		"upperLimitSeconds":   int(upperLimit),
		"averageFormatted":    formatSeconds(int(mean)),
		"upperLimitFormatted": formatSeconds(int(upperLimit)),
	})
}

func (h *ProcessHandler) Search(c *gin.Context) {
	page, _     := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if page < 1 { page = 1 }
	if pageSize < 1 || pageSize > 500 { pageSize = 10 }

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db := h.repo.Q(ctx)

	if v := c.Query("identificationNumber"); v != "" {
		db = db.Where("identification_number ILIKE ?", "%"+v+"%")
	}
	if v := c.Query("userId"); v != "" {
		db = db.Where("user_ref->>'id' = ?", v)
	}
	if v := c.Query("departmentId"); v != "" {
		db = db.Where("department->>'id' = ?", v)
	}
	if v := c.Query("processTypeId"); v != "" {
		db = db.Where("process_type->>'id' = ?", v)
	}
	if v := c.Query("machineId"); v != "" {
		db = db.Where("machine_ref->>'id' = ?", v)
	}
	if v := c.Query("finished"); v != "" {
		db = db.Where("finished = ?", v == "true")
	}

	var total int64
	db.Count(&total)

	var processes []models.Process
	db.Offset((page-1)*pageSize).Limit(pageSize).Order("start_date DESC").Find(&processes)
	EnrichProcessesOperatorOccurrence(ctx, h.db, processes)

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages < 1 { totalPages = 1 }

	c.JSON(http.StatusOK, gin.H{
		"items": processes, "page": page, "pageSize": pageSize,
		"total": total, "totalPages": totalPages,
	})
}

func (h *ProcessHandler) GetUserStats(c *gin.Context) {
	userId := c.Param("userId")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var processes []models.Process
	h.repo.Q(ctx).Where("user_ref->>'id' = ? AND finished = ?", userId, true).Find(&processes)

	var times []float64
	for _, p := range processes {
		if secs := parseTimeToSeconds(p.ProcessTime); secs > 0 {
			times = append(times, secs)
		}
	}
	if len(times) == 0 {
		c.JSON(http.StatusOK, gin.H{"count": 0, "averageSeconds": 0, "averageFormatted": "—"})
		return
	}
	var sum float64
	for _, t := range times { sum += t }
	mean := sum / float64(len(times))
	c.JSON(http.StatusOK, gin.H{
		"count": len(times), "averageSeconds": int(mean),
		"averageFormatted": formatSeconds(int(mean)),
	})
}

func (h *ProcessHandler) MonthlySummary(c *gin.Context) {
	userId := c.Param("userId")
	year, _  := strconv.Atoi(c.Param("year"))
	month, _ := strconv.Atoi(c.Param("month"))

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var all []models.Process
	h.repo.Q(ctx).Where("user_ref->>'id' = ? AND finished = ?", userId, true).Find(&all)

	var monthly []models.Process
	for _, p := range all {
		if p.StartDate.Year() == year && int(p.StartDate.Month()) == month {
			monthly = append(monthly, p)
		}
	}

	var totalSecs float64
	for _, p := range monthly { totalSecs += parseTimeToSeconds(p.ProcessTime) }
	count := len(monthly)
	avgSecs := 0.0
	if count > 0 { avgSecs = totalSecs / float64(count) }

	c.JSON(http.StatusOK, gin.H{
		"count": count, "totalSeconds": int(totalSecs),
		"averageSeconds": int(avgSecs), "averageFormatted": formatSeconds(int(avgSecs)),
	})
}

func (h *ProcessHandler) PauseProcess(c *gin.Context) {
	var req struct {
		OccurrenceTypeId string `json:"occurrenceTypeId"`
		Description      string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	req.OccurrenceTypeId = strings.TrimSpace(req.OccurrenceTypeId)
	if req.OccurrenceTypeId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Tipo de ocorrência é obrigatório"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var outOcc *models.Occurrence
	if err := h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		repo := repositories.New[models.Process](tx, "processes")
		occRepo := repositories.New[models.Occurrence](tx, "occurrences")
		userRepo := repositories.New[models.User](tx, "users")
		machineRepo := repositories.New[models.Machine](tx, "machines")
		occTypeRepo := repositories.New[models.BaseEntity](tx, "occurrence_types")

		var process models.Process
		if err := repo.Q(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", c.Param("id")).First(&process).Error; err != nil {
			return err
		}
		if process.InOccurrence {
			// Idempotente: já pausado.
			var existing models.Occurrence
			if err := occRepo.Q(ctx).Where("process_ref->>'id' = ? AND finished = ?", process.ID, false).Order("start_date DESC").First(&existing).Error; err == nil {
				outOcc = &existing
			}
			return nil
		}

		occ := &models.Occurrence{
			CodeOccurrence: fmt.Sprintf("OC%06d", time.Now().UnixMilli()%1000000),
			StartDate:      time.Now().UTC(),
			Finished:       false,
			Description:    req.Description,
			Process:        &models.ReferenceEntity{ID: process.ID, Name: process.IdentificationNumber},
			User:           process.User,
			Department:     process.Department,
			Machine:        process.Machine,
		}
		if ot, err := occTypeRepo.FindByID(ctx, req.OccurrenceTypeId); err == nil {
			if strings.EqualFold(strings.TrimSpace(ot.Name), "Outro") && strings.TrimSpace(req.Description) == "" {
				return fmt.Errorf(`bad_request: informe o motivo quando o tipo de ocorrência for "Outro"`)
			}
			occ.OccurrenceType = &models.ReferenceEntity{ID: ot.ID, Name: ot.Name}
		} else {
			return fmt.Errorf("bad_request: tipo de ocorrência inválido")
		}
		if err := occRepo.Create(ctx, occ); err != nil {
			return err
		}

		process.InOccurrence = true
		process.OccurrenceStartDate = &occ.StartDate
		process.Occurrences = append(process.Occurrences, models.ReferenceEntity{ID: occ.ID, Name: occ.CodeOccurrence})
		if err := repo.Save(ctx, &process); err != nil {
			return err
		}
		if process.Machine != nil && process.Machine.ID != "" {
			if m, err := machineRepo.FindByID(ctx, process.Machine.ID); err == nil {
				SyncMachineStatusForMachine(ctx, repo, machineRepo, m)
			}
		}
		if process.User != nil && process.User.ID != "" {
			if u, err := userRepo.FindByID(ctx, process.User.ID); err == nil {
				u.CurrentOccurrence = &models.ReferenceEntity{ID: occ.ID, Name: occ.CodeOccurrence}
				if err := userRepo.Save(ctx, u); err != nil {
					return err
				}
			}
		}
		outOcc = occ
		return nil
	}); err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"message": "Processo não encontrado"})
			return
		}
		if strings.HasPrefix(err.Error(), "bad_request:") {
			c.JSON(http.StatusBadRequest, gin.H{"message": strings.TrimPrefix(err.Error(), "bad_request: ")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Processo pausado", "occurrence": outOcc})
}

func (h *ProcessHandler) ResumeProcess(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var alreadyResumed bool
	if err := h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		repo := repositories.New[models.Process](tx, "processes")
		occRepo := repositories.New[models.Occurrence](tx, "occurrences")
		userRepo := repositories.New[models.User](tx, "users")
		machineRepo := repositories.New[models.Machine](tx, "machines")

		var process models.Process
		if err := repo.Q(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", c.Param("id")).First(&process).Error; err != nil {
			return err
		}
		if !process.InOccurrence {
			alreadyResumed = true
			return nil
		}

		if process.User != nil && process.User.ID != "" {
			var count int64
			repo.Q(ctx).
				Where("user_ref->>'id' = ? AND finished = ? AND in_occurrence = ? AND id != ?",
					process.User.ID, false, false, process.ID).
				Count(&count)
			if count > 0 {
				return fmt.Errorf("conflict: usuário possui outro processo em andamento. Encerre-o antes de retomar.")
			}
		}

		var occ models.Occurrence
		if err := occRepo.Q(ctx).
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("process_ref->>'id' = ? AND finished = ?", process.ID, false).
			Order("start_date DESC").First(&occ).Error; err != nil {
			alreadyResumed = true
			process.InOccurrence = false
			process.OccurrenceStartDate = nil
			return repo.Save(ctx, &process)
		}

		now := time.Now().UTC()
		occSecs := utils.WorkingSeconds(occ.StartDate, now)
		occ.Finished = true
		occ.EndDate = &now
		occ.ProcessTime = utils.FormatSeconds(occSecs)
		if err := occRepo.Save(ctx, &occ); err != nil {
			return err
		}

		process.InOccurrence = false
		process.OccurrenceStartDate = nil
		process.TotalOccurrenceSeconds += occSecs
		if err := repo.Save(ctx, &process); err != nil {
			return err
		}

		if process.Machine != nil && process.Machine.ID != "" {
			if m, err := machineRepo.FindByID(ctx, process.Machine.ID); err == nil {
				SyncMachineStatusForMachine(ctx, repo, machineRepo, m)
			}
		}
		if process.User != nil && process.User.ID != "" {
			if u, err := userRepo.FindByID(ctx, process.User.ID); err == nil {
				u.CurrentOccurrence = nil
				if err := userRepo.Save(ctx, u); err != nil {
					return err
				}
			}
		}
		return nil
	}); err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"message": "Processo não encontrado"})
			return
		}
		if strings.HasPrefix(err.Error(), "conflict:") {
			c.JSON(http.StatusConflict, gin.H{"message": strings.TrimPrefix(err.Error(), "conflict: ")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	if alreadyResumed {
		c.JSON(http.StatusOK, gin.H{"message": "Processo já estava retomado"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Processo retomado"})
}

func (h *ProcessHandler) UpdateHistoryTime(c *gin.Context) {
	var req struct {
		StartDate string `json:"startDate"`
		EndDate   string `json:"endDate"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	startDate, err := time.Parse(time.RFC3339, req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "startDate inválido (use RFC3339)"})
		return
	}
	endDate, err := time.Parse(time.RFC3339, req.EndDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "endDate inválido (use RFC3339)"})
		return
	}
	if !endDate.After(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "endDate deve ser maior que startDate"})
		return
	}

	s := startDate.UTC()
	e := endDate.UTC()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var updated *models.Process
	if err := h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		repo := repositories.New[models.Process](tx, "processes")
		userRepo := repositories.New[models.User](tx, "users")
		var process models.Process
		if err := repo.Q(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", c.Param("id")).First(&process).Error; err != nil {
			return err
		}
		userID := strings.TrimSpace(fmt.Sprint(c.GetString("userId")))
		if userID == "" {
			if v, ok := c.Get("userId"); ok {
				userID = strings.TrimSpace(fmt.Sprint(v))
			}
		}
		if userID == "" {
			return fmt.Errorf("forbidden: usuário autenticado inválido")
		}
		// Permissão: admin pode ajustar qualquer processo; usuário comum só o próprio.
		isAdmin := false
		if authUser, err := userRepo.FindByID(ctx, userID); err == nil && authUser != nil && authUser.UserType != nil {
			isAdmin = strings.EqualFold(strings.TrimSpace(authUser.UserType.Name), "Administrador")
		}
		ownerID := ""
		if process.User != nil {
			ownerID = strings.TrimSpace(process.User.ID)
		}
		if !isAdmin && (ownerID == "" || ownerID != userID) {
			return fmt.Errorf("forbidden: sem permissão para ajustar este processo")
		}
		if !process.Finished {
			return fmt.Errorf("conflict: apenas processos finalizados podem ser ajustados no histórico")
		}
		if process.InOccurrence {
			return fmt.Errorf("conflict: processo em ocorrência não pode ser ajustado")
		}

		// Preserva o tempo ocioso já registrado no processo e recalcula apenas o tempo
		// de serviço com base no novo intervalo ajustado.
		totalOccurrenceSeconds := process.TotalOccurrenceSeconds
		totalWorkingSecs := utils.WorkingSeconds(s, e)
		if totalOccurrenceSeconds > totalWorkingSecs {
			totalOccurrenceSeconds = totalWorkingSecs
		}
		workSecs := totalWorkingSecs - totalOccurrenceSeconds

		// UPDATE explícito: Updates/Model com map em alguns drivers não persiste como esperado;
		// SQL direto evita zerar JSONB e garante que data/hora e tempos gravem corretamente.
		pt := utils.FormatSeconds(workSecs)
		res := tx.WithContext(ctx).Exec(`
			UPDATE processes
			SET start_date = ?, end_date = ?, total_occurrence_seconds = ?, process_time = ?
			WHERE id = ?`,
			s, e, totalOccurrenceSeconds, pt, process.ID,
		)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		var fresh models.Process
		if err := repo.Q(ctx).Where("id = ?", process.ID).First(&fresh).Error; err != nil {
			return err
		}
		reload := []models.Process{fresh}
		EnrichProcessesOperatorOccurrence(ctx, tx, reload)
		updated = &reload[0]
		return nil
	}); err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"message": "Processo não encontrado"})
			return
		}
		if strings.HasPrefix(err.Error(), "conflict:") {
			c.JSON(http.StatusConflict, gin.H{"message": strings.TrimPrefix(err.Error(), "conflict: ")})
			return
		}
		if strings.HasPrefix(err.Error(), "forbidden:") {
			c.JSON(http.StatusForbidden, gin.H{"message": strings.TrimPrefix(err.Error(), "forbidden: ")})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Horários do processo atualizados",
		"item":    updated,
	})
}

func generateNumericCode() string {
	return fmt.Sprintf("%06d", rand.Intn(999999))
}

func formatDuration(d time.Duration) string {
	h := int(d.Hours())
	m := int(d.Minutes()) % 60
	s := int(d.Seconds()) % 60
	return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
}

func parseTimeToSeconds(t string) float64 {
	parts := strings.Split(t, ":")
	if len(parts) != 3 { return 0 }
	h, _ := strconv.Atoi(parts[0])
	m, _ := strconv.Atoi(parts[1])
	s, _ := strconv.Atoi(parts[2])
	return float64(h*3600 + m*60 + s)
}

func formatSeconds(secs int) string {
	h := secs / 3600
	m := (secs % 3600) / 60
	s := secs % 60
	return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
}
