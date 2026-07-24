package handlers

import (
	"context"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type MachineHandler struct {
	db          *gorm.DB
	repo        *repositories.Repository[models.Machine]
	processRepo *repositories.Repository[models.Process]
	occRepo     *repositories.Repository[models.Occurrence]
}

func NewMachineHandler(db *gorm.DB) *MachineHandler {
	return &MachineHandler{
		db:          db,
		repo:        repositories.New[models.Machine](db, "machines"),
		processRepo: repositories.New[models.Process](db, "processes"),
		occRepo:     repositories.New[models.Occurrence](db, "occurrences"),
	}
}

func (h *MachineHandler) GetAll(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db := h.repo.Q(ctx)
	if s := c.Query("status"); s != "" {
		if v, err := strconv.Atoi(s); err == nil {
			db = db.Where("status = ?", v)
		}
	}
	var machines []models.Machine
	if err := db.Find(&machines).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, machines)
}

func (h *MachineHandler) Search(c *gin.Context) {
	q := c.Query("q")
	statusStr := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "12"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 12
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := h.repo.Q(ctx)
	if q != "" {
		db = db.Where("identification_number ILIKE ? OR customer_name ILIKE ? OR serial_number ILIKE ?",
			"%"+q+"%", "%"+q+"%", "%"+q+"%")
	}
	if statusStr != "" {
		if v, err := strconv.Atoi(statusStr); err == nil {
			db = db.Where("status = ?", v)
		}
	}

	var total int64
	db.Count(&total)

	var machines []models.Machine
	db.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&machines)

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages < 1 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, gin.H{
		"items": machines, "page": page, "pageSize": pageSize,
		"total": total, "totalPages": totalPages,
	})
}

func (h *MachineHandler) GetByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	machine, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Máquina não encontrada"})
		return
	}
	c.JSON(http.StatusOK, machine)
}

func (h *MachineHandler) GetDetail(c *gin.Context) {
	id := c.Param("id")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	machine, err := h.repo.FindByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Máquina não encontrada"})
		return
	}

	candidates := machineReferenceCandidates(machine)
	procQ := applyMachineReferenceFilter(h.processRepo.Q(ctx), candidates)
	occQ := excludeSystemAutoPauseOccurrences(applyMachineReferenceFilter(h.occRepo.Q(ctx), candidates))

	var totalProc, activeProc, totalOcc, activeOcc int64
	procQ.Count(&totalProc)
	procQ.Where("finished = ?", false).Count(&activeProc)
	occQ.Count(&totalOcc)
	occQ.Where("finished = ?", false).Count(&activeOcc)

	var recentProc []models.Process
	var recentOcc []models.Occurrence
	procQ.Order("start_date DESC").Limit(15).Find(&recentProc)
	occQ.Order("start_date DESC").Limit(15).Find(&recentOcc)

	if recentProc == nil {
		recentProc = []models.Process{}
	}
	if recentOcc == nil {
		recentOcc = []models.Occurrence{}
	}

	stageSummary, hasFinishedTestChamber := h.computeStageSummary(ctx, machine)

	c.JSON(http.StatusOK, gin.H{
		"machine": machine,
		"stats": gin.H{
			"totalProcesses":    totalProc,
			"activeProcesses":   activeProc,
			"totalOccurrences":  totalOcc,
			"activeOccurrences": activeOcc,
		},
		"recentProcesses":   recentProc,
		"recentOccurrences": recentOcc,
		"stageSummary":      stageSummary,
		"canFinish":         hasFinishedTestChamber && machine.Status != models.Finished,
	})
}

// stageTime é o tempo total (somando todos os processos finalizados) gasto
// numa etapa de fabricação (Elétrica, Soldagem, Montagem, Acabamento, Câmara
// de Teste) numa máquina.
type stageTime struct {
	StageName    string `json:"stageName"`
	TotalSeconds int    `json:"totalSeconds"`
	Formatted    string `json:"formatted"`
}

// computeStageSummary soma o tempo de fabricação por etapa e o total geral, e
// indica se a máquina já tem uma Câmara de Teste finalizada (o que libera o
// botão "Finalizar Máquina").
func (h *MachineHandler) computeStageSummary(ctx context.Context, machine *models.Machine) (gin.H, bool) {
	candidates := machineReferenceCandidates(machine, machine.ID)
	var procs []models.Process
	applyMachineReferenceFilter(h.processRepo.Q(ctx), candidates).
		Where("finished = ?", true).
		Find(&procs)

	totalsByStage := map[string]int{}
	totalSeconds := 0
	hasFinishedTestChamber := false
	for _, p := range procs {
		if p.ProcessType == nil {
			continue
		}
		// Existência da Câmara de Teste concluída independe da duração — mesmo
		// um processo de 0s finalizado conta pra liberar "Finalizar Máquina".
		if strings.EqualFold(strings.TrimSpace(p.ProcessType.Name), models.StageCamaraDeTeste) {
			hasFinishedTestChamber = true
		}
		secs := int(parseTimeToSeconds(p.ProcessTime))
		if secs <= 0 {
			continue
		}
		totalsByStage[p.ProcessType.Name] += secs
		totalSeconds += secs
	}

	stages := make([]stageTime, 0, len(totalsByStage))
	for name, secs := range totalsByStage {
		stages = append(stages, stageTime{StageName: name, TotalSeconds: secs, Formatted: formatSeconds(secs)})
	}
	sort.Slice(stages, func(i, j int) bool { return stages[i].StageName < stages[j].StageName })

	return gin.H{
		"stages":         stages,
		"totalSeconds":   totalSeconds,
		"totalFormatted": formatSeconds(totalSeconds),
	}, hasFinishedTestChamber
}

// FinishMachine marca a máquina como Finalizada — só permitido depois de um
// processo de Câmara de Teste finalizado (a última etapa de fabricação).
func (h *MachineHandler) FinishMachine(c *gin.Context) {
	id := c.Param("id")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	machine, err := h.repo.FindByID(ctx, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Máquina não encontrada"})
		return
	}
	if machine.Status == models.Finished {
		c.JSON(http.StatusOK, gin.H{"message": "Máquina já estava finalizada", "machine": machine})
		return
	}

	_, hasFinishedTestChamber := h.computeStageSummary(ctx, machine)
	if !hasFinishedTestChamber {
		c.JSON(http.StatusConflict, gin.H{"message": "A máquina ainda não concluiu a Câmara de Teste — não pode ser finalizada"})
		return
	}

	machine.Status = models.Finished
	if err := h.repo.Save(ctx, machine); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Máquina finalizada", "machine": machine})
}

func (h *MachineHandler) Create(c *gin.Context) {
	var machine models.Machine
	if err := c.ShouldBindJSON(&machine); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if machine.IdentificationNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "identificationNumber obrigatório"})
		return
	}
	machine.CreatedAt = time.Now().UTC()
	if machine.Status == 0 {
		machine.Status = models.WaitingProduction
	}
	if machine.Users == nil {
		machine.Users = []models.ReferenceEntity{}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	existing, _ := h.repo.FindOne(ctx, "identification_number = ?", machine.IdentificationNumber)
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"message": "Código já existe"})
		return
	}

	if err := h.repo.Create(ctx, &machine); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, machine)
}

func (h *MachineHandler) Update(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")
	delete(payload, "createdAt")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := h.repo.MergeUpdate(ctx, c.Param("id"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func (h *MachineHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	machine, _ := h.repo.FindByID(ctx, id)
	idNum := ""
	if machine != nil {
		idNum = machine.IdentificationNumber
	}

	candidates := uniqueMachineCandidates(id, idNum)
	if machine != nil {
		candidates = machineReferenceCandidates(machine, id, idNum)
	}
	procQ := applyMachineReferenceFilter(h.processRepo.Q(ctx).Where("finished = ?", false), candidates)
	occQ := applyMachineReferenceFilter(h.occRepo.Q(ctx).Where("finished = ?", false), candidates)

	var activeProc, activeOcc int64
	procQ.Count(&activeProc)
	if activeProc > 0 {
		c.JSON(http.StatusConflict, gin.H{"message": "Máquina possui processos ativos — finalize-os antes de excluir"})
		return
	}
	occQ.Count(&activeOcc)
	if activeOcc > 0 {
		c.JSON(http.StatusConflict, gin.H{"message": "Máquina possui ocorrências abertas — finalize-as antes de excluir"})
		return
	}

	if err := h.repo.Delete(ctx, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

func (h *MachineHandler) GetStats(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	count := func(where string, args ...interface{}) int64 {
		var n int64
		h.repo.Q(ctx).Where(where, args...).Count(&n)
		return n
	}
	c.JSON(http.StatusOK, gin.H{
		"total":        count("1=1"),
		"waiting":      count("status = ?", models.WaitingProduction),
		"inProgress":   count("status = ?", models.InProgress),
		"inOccurrence": count("status = ?", models.InOccurrence),
		"finished":     count("status = ?", models.Finished),
	})
}

func (h *MachineHandler) Dashboard(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var machines []models.Machine
	if err := h.repo.Q(ctx).Find(&machines).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	stats := map[string]int{
		"total": len(machines), "waitingProduction": 0, "inProgress": 0,
		"inOccurrence": 0, "inRework": 0, "finished": 0, "stop": 0,
	}
	for _, m := range machines {
		switch m.Status {
		case models.WaitingProduction:
			stats["waitingProduction"]++
		case models.InProgress:
			stats["inProgress"]++
		case models.InOccurrence:
			stats["inOccurrence"]++
		case models.InRework:
			stats["inRework"]++
		case models.Finished:
			stats["finished"]++
		case models.Stop:
			stats["stop"]++
		}
	}
	c.JSON(http.StatusOK, gin.H{"machines": machines, "stats": stats})
}
