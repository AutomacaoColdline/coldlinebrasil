package handlers

import (
	"context"
	"fmt"
	"math"
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

type OccurrenceHandler struct {
	db                 *gorm.DB
	repo               *repositories.Repository[models.Occurrence]
	processRepo        *repositories.Repository[models.Process]
	machineRepo        *repositories.Repository[models.Machine]
	userRepo           *repositories.Repository[models.User]
	occurrenceTypeRepo *repositories.Repository[models.BaseEntity]
}

func NewOccurrenceHandler(db *gorm.DB) *OccurrenceHandler {
	return &OccurrenceHandler{
		db:                 db,
		repo:               repositories.New[models.Occurrence](db, "occurrences"),
		processRepo:        repositories.New[models.Process](db, "processes"),
		machineRepo:        repositories.New[models.Machine](db, "machines"),
		userRepo:           repositories.New[models.User](db, "users"),
		occurrenceTypeRepo: repositories.New[models.BaseEntity](db, "occurrence_types"),
	}
}

func isOutroOccurrenceTypeName(name string) bool {
	return strings.EqualFold(strings.TrimSpace(name), "Outro")
}

func (h *OccurrenceHandler) GetByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	occ, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Ocorrência não encontrada"})
		return
	}
	c.JSON(http.StatusOK, occ)
}

func (h *OccurrenceHandler) Search(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 500 {
		pageSize = 10
	}

	rangeStart, err := parseQueryTime(c.Query("rangeStart"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "rangeStart invÃ¡lido. Use RFC3339."})
		return
	}
	rangeEnd, err := parseQueryTime(c.Query("rangeEnd"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "rangeEnd invÃ¡lido. Use RFC3339."})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db := h.repo.Q(ctx)

	if v := c.Query("userId"); v != "" {
		db = db.Where("user_ref->>'id' = ?", v)
	}
	if v := c.Query("departmentId"); v != "" {
		db = db.Where("department->>'id' = ?", v)
	}
	if v := c.Query("occurrenceTypeId"); v != "" {
		db = db.Where("occurrence_type->>'id' = ?", v)
	}
	if v := c.Query("machineId"); v != "" {
		db = applyMachineReferenceFilter(db, resolveMachineReferenceCandidates(ctx, h.machineRepo, v))
	}
	if v := c.Query("machineName"); v != "" {
		db = db.Where("machine_ref->>'name' ILIKE ?", "%"+v+"%")
	}
	if v := c.Query("finished"); v != "" {
		db = db.Where("finished = ?", v == "true")
	}
	if c.Query("excludeSystemAutoPause") == "true" {
		db = excludeSystemAutoPauseOccurrences(db)
	}

	db = applyRangeOverlapFilter(db, "start_date", "end_date", rangeStart, rangeEnd)

	var total int64
	db.Count(&total)

	var occs []models.Occurrence
	db.Offset((page - 1) * pageSize).Limit(pageSize).Order("start_date DESC").Find(&occs)

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages < 1 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, gin.H{
		"items": occs, "page": page, "pageSize": pageSize,
		"total": total, "totalPages": totalPages,
	})
}

func (h *OccurrenceHandler) GetAll(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db := h.repo.Q(ctx)
	if f := c.Query("finished"); f != "" {
		db = db.Where("finished = ?", f == "true")
	}
	var occurrences []models.Occurrence
	if err := db.Find(&occurrences).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, occurrences)
}

func (h *OccurrenceHandler) Create(c *gin.Context) {
	var occ models.Occurrence
	if err := c.ShouldBindJSON(&occ); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	occ.CodeOccurrence = fmt.Sprintf("OC%06d", time.Now().UnixMilli()%1000000)
	occ.StartDate = time.Now().UTC()
	occ.Finished = false
	if occ.OccurrenceType == nil || strings.TrimSpace(occ.OccurrenceType.ID) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Tipo de ocorrência é obrigatório"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if ot, err := h.occurrenceTypeRepo.FindByID(ctx, occ.OccurrenceType.ID); err != nil || ot == nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Tipo de ocorrência inválido"})
		return
	} else {
		if isOutroOccurrenceTypeName(ot.Name) && strings.TrimSpace(occ.Description) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": `Informe o motivo quando o tipo de ocorrência for "Outro"`})
			return
		}
		occ.OccurrenceType = &models.ReferenceEntity{ID: ot.ID, Name: ot.Name}
	}

	if occ.Machine != nil {
		if machine, ok := h.resolveMachine(ctx, occ.Machine.ID, occ.Machine.Name); ok {
			occ.Machine = machineRefFromMachine(machine)
		}
	}
	// Se a ocorrência foi aberta sem processo explícito (ex.: tela de Ocorrências),
	// tenta vincular automaticamente ao processo ativo da máquina para pausar/retomar
	// corretamente o tempo produtivo vs. ocioso.
	if (occ.Process == nil || strings.TrimSpace(occ.Process.ID) == "") && occ.Machine != nil && strings.TrimSpace(occ.Machine.ID) != "" {
		if proc, err := h.processRepo.FindOne(ctx,
			"finished = ? AND in_occurrence = ? AND machine_ref->>'id' = ?",
			false, false, occ.Machine.ID,
		); err == nil && proc != nil {
			occ.Process = &models.ReferenceEntity{ID: proc.ID, Name: proc.IdentificationNumber}
			if occ.User == nil && proc.User != nil {
				occ.User = proc.User
			}
			if occ.Department == nil && proc.Department != nil {
				occ.Department = proc.Department
			}
		}
	}

	if err := h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		repo := repositories.New[models.Occurrence](tx, "occurrences")
		processRepo := repositories.New[models.Process](tx, "processes")
		machineRepo := repositories.New[models.Machine](tx, "machines")
		userRepo := repositories.New[models.User](tx, "users")

		if err := repo.Create(ctx, &occ); err != nil {
			return err
		}
		if occ.Process != nil && occ.Process.ID != "" {
			var proc models.Process
			if err := processRepo.Q(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", occ.Process.ID).First(&proc).Error; err == nil {
				proc.InOccurrence = true
				proc.OccurrenceStartDate = &occ.StartDate
				if err := processRepo.Save(ctx, &proc); err != nil {
					return err
				}
				if proc.Machine != nil && proc.Machine.ID != "" {
					if m, err := machineRepo.FindByID(ctx, proc.Machine.ID); err == nil {
						SyncMachineStatusForMachine(ctx, processRepo, machineRepo, m)
					}
				}
			}
		}
		if occ.User != nil && occ.User.ID != "" {
			if u, err := userRepo.FindByID(ctx, occ.User.ID); err == nil {
				u.CurrentOccurrence = &models.ReferenceEntity{ID: occ.ID, Name: occ.CodeOccurrence}
				if err := userRepo.Save(ctx, u); err != nil {
					return err
				}
			}
		}
		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, occ)
}

func (h *OccurrenceHandler) Update(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	current, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Ocorrência não encontrada"})
		return
	}

	if rawMachine, ok := payload["machine"]; ok {
		if machineMap, ok := rawMachine.(map[string]interface{}); ok {
			idVal, _ := machineMap["id"].(string)
			nameVal, _ := machineMap["name"].(string)
			if machine, found := h.resolveMachine(ctx, idVal, nameVal); found {
				ref := machineRefFromMachine(machine)
				payload["machine"] = map[string]interface{}{"id": ref.ID, "name": ref.Name}
			}
		}
	}
	if rawType, ok := payload["occurrenceType"]; ok {
		typeMap, ok := rawType.(map[string]interface{})
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Tipo de ocorrência inválido"})
			return
		}
		typeID, _ := typeMap["id"].(string)
		typeID = strings.TrimSpace(typeID)
		if typeID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Tipo de ocorrência é obrigatório"})
			return
		}
		if ot, err := h.occurrenceTypeRepo.FindByID(ctx, typeID); err != nil || ot == nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Tipo de ocorrência inválido"})
			return
		} else {
			finalDescription := strings.TrimSpace(current.Description)
			if rawDescription, ok := payload["description"]; ok {
				finalDescription = strings.TrimSpace(fmt.Sprint(rawDescription))
			}
			if isOutroOccurrenceTypeName(ot.Name) && finalDescription == "" {
				c.JSON(http.StatusBadRequest, gin.H{"message": `Informe o motivo quando o tipo de ocorrência for "Outro"`})
				return
			}
			payload["occurrenceType"] = map[string]interface{}{"id": ot.ID, "name": ot.Name}
		}
	}
	if rawDescription, ok := payload["description"]; ok {
		finalTypeName := ""
		if current.OccurrenceType != nil {
			finalTypeName = strings.TrimSpace(current.OccurrenceType.Name)
		}
		if rawType, okType := payload["occurrenceType"]; okType {
			if typeMap, okCast := rawType.(map[string]interface{}); okCast {
				if name, okName := typeMap["name"].(string); okName && strings.TrimSpace(name) != "" {
					finalTypeName = strings.TrimSpace(name)
				}
			}
		}
		if isOutroOccurrenceTypeName(finalTypeName) && strings.TrimSpace(fmt.Sprint(rawDescription)) == "" {
			c.JSON(http.StatusBadRequest, gin.H{"message": `Informe o motivo quando o tipo de ocorrência for "Outro"`})
			return
		}
	}

	if err := h.repo.MergeUpdate(ctx, c.Param("id"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func (h *OccurrenceHandler) Delete(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

func (h *OccurrenceHandler) Finalize(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var processTime string
	var alreadyFinished bool
	if err := h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		repo := repositories.New[models.Occurrence](tx, "occurrences")
		processRepo := repositories.New[models.Process](tx, "processes")
		machineRepo := repositories.New[models.Machine](tx, "machines")
		userRepo := repositories.New[models.User](tx, "users")

		var occ models.Occurrence
		if err := repo.Q(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", c.Param("id")).First(&occ).Error; err != nil {
			return err
		}
		if occ.Finished {
			alreadyFinished = true
			processTime = occ.ProcessTime
			return nil
		}

		now := time.Now().UTC()
		occSecs := utils.WorkingSeconds(occ.StartDate, now)
		occ.Finished = true
		occ.EndDate = &now
		occ.ProcessTime = utils.FormatSeconds(occSecs)
		processTime = occ.ProcessTime
		if err := repo.Save(ctx, &occ); err != nil {
			return err
		}

		if occ.Process != nil && occ.Process.ID != "" {
			var proc models.Process
			if err := processRepo.Q(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", occ.Process.ID).First(&proc).Error; err == nil {
				proc.InOccurrence = false
				proc.OccurrenceStartDate = nil
				proc.TotalOccurrenceSeconds += occSecs
				if err := processRepo.Save(ctx, &proc); err != nil {
					return err
				}
			}
		}
		if occ.Machine != nil && (occ.Machine.ID != "" || occ.Machine.Name != "") {
			if machine, ok := h.resolveMachine(ctx, occ.Machine.ID, occ.Machine.Name); ok {
				SyncMachineStatusForMachine(ctx, processRepo, machineRepo, machine)
			}
		}
		if occ.User != nil && occ.User.ID != "" {
			if u, err := userRepo.FindByID(ctx, occ.User.ID); err == nil {
				u.CurrentOccurrence = nil
				if err := userRepo.Save(ctx, u); err != nil {
					return err
				}
			}
		}
		return nil
	}); err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"message": "Ocorrência não encontrada"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	if alreadyFinished {
		c.JSON(http.StatusOK, gin.H{"message": "Ocorrência já estava finalizada", "processTime": processTime})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Ocorrência finalizada", "processTime": processTime})
}

func (h *OccurrenceHandler) GetStats(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	count := func(where string, args ...interface{}) int64 {
		var n int64
		h.repo.Q(ctx).Where(where, args...).Count(&n)
		return n
	}
	c.JSON(http.StatusOK, gin.H{
		"total":    count("1=1"),
		"active":   count("finished = ?", false),
		"finished": count("finished = ?", true),
	})
}

// machineRefFromMachine grava o UUID da máquina em ref.id (igual a processos) e rótulo legível em name.
func machineRefFromMachine(m *models.Machine) *models.ReferenceEntity {
	if m == nil {
		return nil
	}
	label := strings.TrimSpace(m.IdentificationNumber)
	if label == "" {
		label = strings.TrimSpace(m.CustomerName)
	}
	if label == "" {
		label = m.ID
	}
	return &models.ReferenceEntity{ID: m.ID, Name: label}
}

func (h *OccurrenceHandler) resolveMachine(ctx context.Context, idOrIdent, name string) (*models.Machine, bool) {
	c1 := strings.TrimSpace(idOrIdent)
	c2 := strings.TrimSpace(name)
	candidates := []string{c1, c2}
	seen := map[string]struct{}{}
	// 1) Sempre preferir chave primária (UUID) antes de identificador/nome — evita
	//    outra máquina "roubar" a resolução quando o número bate com o UUID de outro registro
	//    ou quando há colisão de customer_name.
	for _, cand := range candidates {
		if cand == "" {
			continue
		}
		if _, ok := seen[cand]; ok {
			continue
		}
		seen[cand] = struct{}{}
		if m, err := h.machineRepo.FindByID(ctx, cand); err == nil && m != nil {
			return m, true
		}
	}
	// 2) Legado: busca por número de identificação / nome de cliente
	for _, cand := range candidates {
		if cand == "" {
			continue
		}
		if m, _ := h.machineRepo.FindOne(ctx, "identification_number = ?", cand); m != nil {
			return m, true
		}
		if m, _ := h.machineRepo.FindOne(ctx, "customer_name = ?", cand); m != nil {
			return m, true
		}
	}
	return nil, false
}
