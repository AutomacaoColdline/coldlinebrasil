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
	"sync"
	"time"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AtendimentoHandler struct {
	db                *gorm.DB
	repo              *repositories.Repository[models.Atendimento]
	clientRepo        *repositories.Repository[models.Client]
	monitoringRepo    *repositories.Repository[models.Monitoring]
	checklistRepo     *repositories.Repository[models.AtendimentoChecklistTemplate]
}

func NewAtendimentoHandler(db *gorm.DB) *AtendimentoHandler {
	return &AtendimentoHandler{
		db:             db,
		repo:           repositories.New[models.Atendimento](db, "atendimentos"),
		clientRepo:     repositories.New[models.Client](db, "clients"),
		monitoringRepo: repositories.New[models.Monitoring](db, "monitorings"),
		checklistRepo:  repositories.New[models.AtendimentoChecklistTemplate](db, "atendimento_checklist_templates"),
	}
}

var (
	userTypeNameCache sync.Map // map[userTypeID]userTypeName
)

func resolveUserTypeName(db *gorm.DB, idOrName string) string {
	if idOrName == "" {
		return ""
	}
	lower := strings.ToLower(strings.TrimSpace(idOrName))
	if lower == "admin" || lower == "setup" || lower == "administrador" ||
		lower == "tecnico" || lower == "técnico" || lower == "operador" || lower == "supervisor" || lower == "visitante" {
		return lower
	}
	if v, ok := userTypeNameCache.Load(idOrName); ok {
		return v.(string)
	}
	var name string
	row := db.Table("user_types").Select("name").Where("id = ? OR name = ?", idOrName, idOrName).Row()
	if row != nil {
		_ = row.Scan(&name)
	}
	name = strings.ToLower(strings.TrimSpace(name))
	if name != "" {
		userTypeNameCache.Store(idOrName, name)
	}
	return name
}

func atendTimeline(typ, userID, userName string, meta map[string]interface{}) models.TimelineEvent {
	return models.TimelineEvent{
		Type:      typ,
		Timestamp: time.Now().UTC(),
		UserID:    userID,
		UserName:  userName,
		Metadata:  meta,
	}
}

func generateAtendimentoNumber() string {
	t := time.Now()
	return fmt.Sprintf("ATD-%04d%02d%02d-%05d", t.Year(), t.Month(), t.Day(), rand.Intn(99999))
}

func (h *AtendimentoHandler) canManageAtend(c *gin.Context) bool {
	ut, _ := c.Get("userType")
	v := resolveUserTypeName(h.db, fmt.Sprint(ut))
	return v == "admin" || v == "setup" || v == "administrador" || v == "tecnico" || v == "técnico"
}

func isAtendAssignee(a *models.Atendimento, userID string) bool {
	if a == nil || userID == "" {
		return false
	}
	if a.Technician != nil && a.Technician.ID == userID {
		return true
	}
	return false
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

func (h *AtendimentoHandler) GetAll(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db := h.repo.Q(ctx)
	if s := c.Query("status"); s != "" {
		db = db.Where("status = ?", s)
	}
	if p := c.Query("priority"); p != "" {
		db = db.Where("priority = ?", p)
	}
	if cid := c.Query("clientId"); cid != "" {
		db = db.Where("client_ref->>'id' = ?", cid)
	}
	if tid := c.Query("technicianId"); tid != "" {
		db = db.Where("technician_ref->>'id' = ?", tid)
	}
	if !h.canManageAtend(c) {
		uid, _ := ctxUser(c)
		db = db.Where("technician_ref->>'id' = ?", uid)
	}
	var items []models.Atendimento
	if err := db.Order("open_date DESC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *AtendimentoHandler) Search(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "15"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 15
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db := h.repo.Q(ctx)

	if v := c.Query("q"); v != "" {
		p := "%" + v + "%"
		db = db.Where(`number ILIKE ? OR problem_description ILIKE ? OR equipment ILIKE ? 
			OR serial_number ILIKE ? OR client_name ILIKE ? OR client_document ILIKE ?
			OR identified_cause ILIKE ? OR applied_solution ILIKE ? OR internal_observations ILIKE ?
			OR equipment ILIKE ? OR installation_location ILIKE ?`,
			p, p, p, p, p, p, p, p, p, p, p)
	}
	if v := c.Query("status"); v != "" {
		db = db.Where("status = ?", v)
	}
	if v := c.Query("priority"); v != "" {
		db = db.Where("priority = ?", v)
	}
	if v := c.Query("clientId"); v != "" {
		db = db.Where("client_ref->>'id' = ?", v)
	}
	if v := c.Query("technicianId"); v != "" {
		db = db.Where("technician_ref->>'id' = ?", v)
	}
	if v := c.Query("equipmentType"); v != "" {
		db = db.Where("equipment_type = ?", v)
	}
	if v := c.Query("tag"); v != "" {
		db = db.Where("tags @> ?", fmt.Sprintf(`["%s"]`, strings.ReplaceAll(v, `"`, `\"`)))
	}
	if !h.canManageAtend(c) {
		uid, _ := ctxUser(c)
		db = db.Where("technician_ref->>'id' = ?", uid)
	}

	var total int64
	db.Count(&total)

	var items []models.Atendimento
	db.Offset((page - 1) * pageSize).Limit(pageSize).Order("open_date DESC").Find(&items)

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages < 1 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, gin.H{
		"items": items, "page": page, "pageSize": pageSize,
		"total": total, "totalPages": totalPages,
	})
}

func (h *AtendimentoHandler) GetByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	item, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}
	if !h.canManageAtend(c) {
		uid, _ := ctxUser(c)
		if !isAtendAssignee(item, uid) {
			c.JSON(http.StatusForbidden, gin.H{"message": "Sem permissão para visualizar este atendimento"})
			return
		}
	}
	c.JSON(http.StatusOK, item)
}

func (h *AtendimentoHandler) Create(c *gin.Context) {
	var req struct {
		ClientID            string                   `json:"clientId"`
		ClientName          string                   `json:"clientName"`
		ClientDocument      string                   `json:"clientDocument"`
		ClientPhone         string                   `json:"clientPhone"`
		ClientEmail         string                   `json:"clientEmail"`
		ClientAddress       string                   `json:"clientAddress"`
		TechnicianID        string                   `json:"technicianId"`
		TechnicianName      string                   `json:"technicianName"`
		Team                string                   `json:"team"`
		Priority            models.AtendimentoPriority `json:"priority"`
		Status              models.AtendimentoStatus `json:"status"`
		ProblemDescription  string                   `json:"problemDescription"`
		Equipment           string                   `json:"equipment"`
		EquipmentType       models.AtendimentoEquipmentType `json:"equipmentType"`
		InstallationLocation string                  `json:"installationLocation"`
		SerialNumber        string                   `json:"serialNumber"`
		Tags                []string                 `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	userID, userName := ctxUser(c)
	now := time.Now().UTC()

	status := req.Status
	if status == "" {
		status = models.AtendAberto
	}
	priority := req.Priority
	if priority == "" {
		priority = models.AtendPrioridadeMedia
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	a := &models.Atendimento{
		Number:               generateAtendimentoNumber(),
		OpenDate:             now,
		Status:               status,
		Priority:             priority,
		Team:                 req.Team,
		ProblemDescription:   req.ProblemDescription,
		Equipment:            req.Equipment,
		EquipmentType:        req.EquipmentType,
		InstallationLocation: req.InstallationLocation,
		SerialNumber:         req.SerialNumber,
		Tags:                 req.Tags,
		ClientName:           req.ClientName,
		ClientDocument:       req.ClientDocument,
		ClientPhone:          req.ClientPhone,
		ClientEmail:          req.ClientEmail,
		ClientAddress:        req.ClientAddress,
		Images:               []models.AtendimentoFile{},
		Documents:            []models.AtendimentoFile{},
		Timeline: []models.TimelineEvent{atendTimeline(
			"CRIADO", userID, userName,
			map[string]interface{}{"number": ""},
		)},
		CreatedAt: now,
		UpdatedAt: now,
		CreatedBy: &models.ReferenceEntity{ID: userID, Name: userName},
	}

	if req.TechnicianID != "" {
		a.Technician = &models.ReferenceEntity{ID: req.TechnicianID, Name: req.TechnicianName}
	}

	if req.ClientID != "" {
		if client, err := h.clientRepo.FindByID(ctx, req.ClientID); err == nil {
			a.Client = &models.ReferenceEntity{ID: client.ID, Name: client.Name}
			a.ClientName = client.Name
			a.ClientDocument = client.Document
			a.ClientPhone = client.Phone
			a.ClientEmail = client.Email
			a.ClientAddress = client.Address
		} else if monitor, err := h.monitoringRepo.FindByID(ctx, req.ClientID); err == nil {
			addr := []string{}
			if monitor.Cidade != "" {
				addr = append(addr, monitor.Cidade)
			}
			if monitor.Estado != "" {
				addr = append(addr, monitor.Estado)
			}
			a.Client = &models.ReferenceEntity{ID: monitor.ID, Name: monitor.Unidade}
			a.ClientName = monitor.Unidade
			a.ClientDocument = monitor.Identificador
			a.ClientPhone = ""
			a.ClientEmail = ""
			a.ClientAddress = strings.Join(addr, " - ")
		}
	}

	if err := h.repo.Create(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, a)
}

func (h *AtendimentoHandler) Update(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")
	delete(payload, "number")
	delete(payload, "openDate")
	delete(payload, "createdAt")
	delete(payload, "createdBy")
	delete(payload, "timeline")
	delete(payload, "images")
	delete(payload, "documents")
	delete(payload, "timeLogs")
	delete(payload, "diagnosisHistory")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	payload["updatedAt"] = time.Now().UTC()
	if err := h.repo.MergeUpdate(ctx, c.Param("id"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func (h *AtendimentoHandler) Delete(c *gin.Context) {
	if !h.canManageAtend(c) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Sem permissão"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

// ── Status ───────────────────────────────────────────────────────────────────

func (h *AtendimentoHandler) UpdateStatus(c *gin.Context) {
	var req struct {
		Status models.AtendimentoStatus `json:"status"`
		Notes  string                   `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "status obrigatório"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	a, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}

	userID, userName := ctxUser(c)
	oldStatus := a.Status
	a.Status = req.Status
	now := time.Now().UTC()
	if req.Status == models.AtendEncerrado || req.Status == models.AtendResolvido {
		a.CloseDate = &now
	}
	meta := map[string]interface{}{"from": oldStatus, "to": req.Status}
	if req.Notes != "" {
		meta["notes"] = req.Notes
	}
	a.Timeline = append(a.Timeline, atendTimeline("STATUS_ALTERADO", userID, userName, meta))
	a.UpdatedAt = now

	if err := h.repo.Save(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Status atualizado"})
}

// ── Technician ───────────────────────────────────────────────────────────────

func (h *AtendimentoHandler) AssignTechnician(c *gin.Context) {
	var req struct {
		TechnicianID   string `json:"technicianId"`
		TechnicianName string `json:"technicianName"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.TechnicianID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "technicianId obrigatório"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	a, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}

	userID, userName := ctxUser(c)
	old := a.Technician
	a.Technician = &models.ReferenceEntity{ID: req.TechnicianID, Name: req.TechnicianName}
	a.Timeline = append(a.Timeline, atendTimeline("TECNICO_ATRIBUIDO", userID, userName, map[string]interface{}{
		"technicianId": req.TechnicianID, "technicianName": req.TechnicianName,
		"previousId": func() string {
			if old != nil {
				return old.ID
			}
			return ""
		}(),
	}))
	a.UpdatedAt = time.Now().UTC()

	if err := h.repo.Save(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Técnico atribuído"})
}

// ── Diagnóstico (com histórico) ───────────────────────────────────────────────

func (h *AtendimentoHandler) UpdateDiagnosis(c *gin.Context) {
	var req struct {
		InitialDiagnosis      string `json:"initialDiagnosis"`
		FinalDiagnosis        string `json:"finalDiagnosis"`
		IdentifiedCause       string `json:"identifiedCause"`
		AppliedSolution       string `json:"appliedSolution"`
		CorrectiveActions     string `json:"correctiveActions"`
		PreventiveActions     string `json:"preventiveActions"`
		InternalObservations  string `json:"internalObservations"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	a, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}

	userID, userName := ctxUser(c)
	now := time.Now().UTC()

	type fieldTrack struct {
		key, label, oldV, newV string
	}
	fields := []fieldTrack{
		{"initialDiagnosis", "Diagnóstico inicial", a.InitialDiagnosis, req.InitialDiagnosis},
		{"finalDiagnosis", "Diagnóstico final", a.FinalDiagnosis, req.FinalDiagnosis},
		{"identifiedCause", "Causa identificada", a.IdentifiedCause, req.IdentifiedCause},
		{"appliedSolution", "Solução aplicada", a.AppliedSolution, req.AppliedSolution},
		{"correctiveActions", "Ações corretivas", a.CorrectiveActions, req.CorrectiveActions},
		{"preventiveActions", "Ações preventivas", a.PreventiveActions, req.PreventiveActions},
		{"internalObservations", "Observações internas", a.InternalObservations, req.InternalObservations},
	}

	changes := 0
	for _, f := range fields {
		if f.oldV != f.newV {
			a.DiagnosisHistory = append(a.DiagnosisHistory, models.AtendimentoDiagnosisEdit{
				Field:     f.label,
				OldValue:  f.oldV,
				NewValue:  f.newV,
				UserID:    userID,
				UserName:  userName,
				Timestamp: now,
			})
			a.Timeline = append(a.Timeline, atendTimeline("DIAGNOSTICO_ALTERADO", userID, userName, map[string]interface{}{
				"field": f.label,
			}))
			changes++
		}
	}

	a.InitialDiagnosis = req.InitialDiagnosis
	a.FinalDiagnosis = req.FinalDiagnosis
	a.IdentifiedCause = req.IdentifiedCause
	a.AppliedSolution = req.AppliedSolution
	a.CorrectiveActions = req.CorrectiveActions
	a.PreventiveActions = req.PreventiveActions
	a.InternalObservations = req.InternalObservations
	a.UpdatedAt = now

	if err := h.repo.Save(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Diagnóstico salvo",
		"changes": changes,
	})
}

// ── Anexos (upload) ──────────────────────────────────────────────────────────

func (h *AtendimentoHandler) UploadFile(c *gin.Context) {
	kind := c.DefaultPostForm("kind", "image")
	section := c.PostForm("section")

	if kind != "image" && kind != "document" {
		kind = "image"
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "arquivo não encontrado"})
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".bin"
	}
	fileID := fmt.Sprintf("%d_%04d", time.Now().UnixMilli(), rand.Intn(9999))
	subdir := "images"
	if kind == "document" {
		subdir = "docs"
	}
	fileName := fmt.Sprintf("atend_%s%s", fileID, ext)
	dir := fmt.Sprintf("./wwwroot/uploads/atendimentos/%s", subdir)
	if err := os.MkdirAll(dir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "erro ao criar diretório"})
		return
	}
	dst, err := os.Create(filepath.Join(dir, fileName))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "erro ao salvar arquivo"})
		return
	}
	defer dst.Close()
	if _, err := io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "erro ao gravar arquivo"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	a, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}

	userID, userName := ctxUser(c)
	now := time.Now().UTC()
	entry := models.AtendimentoFile{
		ID:             fileID,
		Name:           header.Filename,
		URL:            fmt.Sprintf("uploads/atendimentos/%s/%s", subdir, fileName),
		MimeType:       header.Header.Get("Content-Type"),
		Size:           header.Size,
		Kind:           kind,
		UploadedAt:     now,
		UploadedBy:     userID,
		UploadedByName: userName,
		Section:        section,
	}
	if kind == "image" {
		a.Images = append(a.Images, entry)
	} else {
		a.Documents = append(a.Documents, entry)
	}
	a.Timeline = append(a.Timeline, atendTimeline("ARQUIVO_ANEXADO", userID, userName, map[string]interface{}{
		"fileName": header.Filename, "kind": kind, "size": header.Size,
	}))
	a.UpdatedAt = now

	if err := h.repo.Save(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, entry)
}

func (h *AtendimentoHandler) DeleteFile(c *gin.Context) {
	fileID := c.Param("fileId")
	kind := c.DefaultQuery("kind", "image")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	a, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}

	if kind == "image" {
		filtered := a.Images[:0]
		for _, f := range a.Images {
			if f.ID == fileID {
				os.Remove(filepath.Join("./wwwroot", f.URL))
			} else {
				filtered = append(filtered, f)
			}
		}
		a.Images = filtered
	} else {
		filtered := a.Documents[:0]
		for _, f := range a.Documents {
			if f.ID == fileID {
				os.Remove(filepath.Join("./wwwroot", f.URL))
			} else {
				filtered = append(filtered, f)
			}
		}
		a.Documents = filtered
	}

	userID, userName := ctxUser(c)
	a.Timeline = append(a.Timeline, atendTimeline("ARQUIVO_REMOVIDO", userID, userName, map[string]interface{}{
		"fileId": fileID, "kind": kind,
	}))
	a.UpdatedAt = time.Now().UTC()

	if err := h.repo.Save(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Arquivo removido"})
}

// ── Tags ─────────────────────────────────────────────────────────────────────

func (h *AtendimentoHandler) UpdateTags(c *gin.Context) {
	var req struct {
		Tags []string `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	a, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}
	userID, userName := ctxUser(c)
	a.Tags = req.Tags
	a.Timeline = append(a.Timeline, atendTimeline("TAGS_ALTERADAS", userID, userName, map[string]interface{}{
		"tags": req.Tags,
	}))
	a.UpdatedAt = time.Now().UTC()
	if err := h.repo.Save(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Tags atualizadas", "tags": a.Tags})
}

// ── Controle de Horas ────────────────────────────────────────────────────────

func (h *AtendimentoHandler) StartTimeLog(c *gin.Context) {
	var req struct {
		IsTravel bool   `json:"isTravel"`
		Notes    string `json:"notes"`
	}
	_ = c.ShouldBindJSON(&req)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	a, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}
	for i := range a.TimeLogs {
		if a.TimeLogs[i].EndTime == nil {
			c.JSON(http.StatusConflict, gin.H{"message": "Já existe um controle de tempo em andamento"})
			return
		}
	}
	userID, userName := ctxUser(c)
	now := time.Now().UTC()
	log := models.AtendimentoTimeLog{
		ID:        fmt.Sprintf("%d", time.Now().UnixMilli()),
		StartTime: now,
		IsTravel:  req.IsTravel,
		UserID:    userID,
		UserName:  userName,
		Notes:     req.Notes,
	}
	a.TimeLogs = append(a.TimeLogs, log)
	a.Timeline = append(a.Timeline, atendTimeline("TEMPO_INICIADO", userID, userName, map[string]interface{}{
		"isTravel": req.IsTravel,
	}))
	a.UpdatedAt = now
	if err := h.repo.Save(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, log)
}

func (h *AtendimentoHandler) StopTimeLog(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	a, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}
	now := time.Now().UTC()
	var openLog *models.AtendimentoTimeLog
	for i := range a.TimeLogs {
		if a.TimeLogs[i].EndTime == nil {
			openLog = &a.TimeLogs[i]
			break
		}
	}
	if openLog == nil {
		c.JSON(http.StatusConflict, gin.H{"message": "Não há controle de tempo em andamento"})
		return
	}
	openLog.EndTime = &now
	openLog.Duration = int(now.Sub(openLog.StartTime).Minutes())
	recalcAtendTimes(a)
	userID, userName := ctxUser(c)
	a.Timeline = append(a.Timeline, atendTimeline("TEMPO_FINALIZADO", userID, userName, map[string]interface{}{
		"duration": openLog.Duration, "isTravel": openLog.IsTravel,
	}))
	a.UpdatedAt = now
	if err := h.repo.Save(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Tempo finalizado", "log": openLog})
}

func recalcAtendTimes(a *models.Atendimento) {
	total := 0
	travel := 0
	for _, l := range a.TimeLogs {
		if l.EndTime != nil {
			total += l.Duration
			if l.IsTravel {
				travel += l.Duration
			}
		}
	}
	a.TotalTimeMinutes = total
	a.TravelTimeMinutes = travel
}

// ── Assinatura Digital ───────────────────────────────────────────────────────

func (h *AtendimentoHandler) Sign(c *gin.Context) {
	var req struct {
		Role string `json:"role"`
		Name string `json:"name"`
		Document string `json:"document"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if req.Role != "technician" && req.Role != "client" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "role deve ser 'technician' ou 'client'"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	a, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}
	userID, userName := ctxUser(c)
	sig := &models.AtendimentoSignature{
		Name:      req.Name,
		Role:      req.Role,
		Document:  req.Document,
		SignedAt:  time.Now().UTC(),
		IPAddress: c.ClientIP(),
	}
	if req.Role == "technician" {
		a.TechnicianSignature = sig
	} else {
		a.ClientSignature = sig
	}
	a.Timeline = append(a.Timeline, atendTimeline("ASSINATURA_REGISTRADA", userID, userName, map[string]interface{}{
		"role": req.Role, "name": req.Name,
	}))
	a.UpdatedAt = time.Now().UTC()
	if err := h.repo.Save(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Assinatura registrada", "signature": sig})
}

// ── Base de Conhecimento ─────────────────────────────────────────────────────

func (h *AtendimentoHandler) PublishToKnowledgeBase(c *gin.Context) {
	var req struct {
		KBProblem    string   `json:"kbProblem"`
		KBCause      string   `json:"kbCause"`
		KBSolution   string   `json:"kbSolution"`
		KBEquipments []string `json:"kbEquipments"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	a, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}
	userID, userName := ctxUser(c)
	a.IsKnowledgeBase = true
	a.KBProblem = req.KBProblem
	a.KBCause = req.KBCause
	a.KBSolution = req.KBSolution
	a.KBEquipments = req.KBEquipments
	a.Timeline = append(a.Timeline, atendTimeline("PUBLICADO_BASE_CONHECIMENTO", userID, userName, nil))
	a.UpdatedAt = time.Now().UTC()
	if err := h.repo.Save(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Publicado na base de conhecimento"})
}

func (h *AtendimentoHandler) ListKnowledgeBase(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var items []models.Atendimento
	if err := h.repo.Q(ctx).Where("is_knowledge_base = true").Order("updated_at DESC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *AtendimentoHandler) UnpublishFromKnowledgeBase(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	a, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}
	userID, userName := ctxUser(c)
	a.IsKnowledgeBase = false
	a.Timeline = append(a.Timeline, atendTimeline("REMOVIDO_BASE_CONHECIMENTO", userID, userName, nil))
	a.UpdatedAt = time.Now().UTC()
	if err := h.repo.Save(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Removido da base de conhecimento"})
}

// ── Checklist ────────────────────────────────────────────────────────────────

func (h *AtendimentoHandler) ListChecklistTemplates(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	items, err := h.checklistRepo.FindAll(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *AtendimentoHandler) CreateChecklistTemplate(c *gin.Context) {
	var req models.AtendimentoChecklistTemplate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	now := time.Now().UTC()
	req.CreatedAt = now
	req.UpdatedAt = now
	if req.ID == "" {
		req.ID = fmt.Sprintf("chk_%d", time.Now().UnixNano())
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.checklistRepo.Create(ctx, &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, req)
}

func (h *AtendimentoHandler) UpdateChecklistTemplate(c *gin.Context) {
	var req models.AtendimentoChecklistTemplate
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	req.UpdatedAt = time.Now().UTC()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.checklistRepo.MergeUpdate(ctx, c.Param("id"), map[string]interface{}{
		"name":      req.Name,
		"category":  req.Category,
		"items":     req.Items,
		"updatedAt": req.UpdatedAt,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func (h *AtendimentoHandler) DeleteChecklistTemplate(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.checklistRepo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

func (h *AtendimentoHandler) ApplyChecklistTemplate(c *gin.Context) {
	var req struct {
		TemplateID string `json:"templateId"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	tpl, err := h.checklistRepo.FindByID(ctx, req.TemplateID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Template não encontrado"})
		return
	}
	a, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}
	now := time.Now().UTC()
	items := make([]models.AtendimentoChecklistItem, 0, len(tpl.Items))
	for _, it := range tpl.Items {
		items = append(items, models.AtendimentoChecklistItem{
			ID:       fmt.Sprintf("item_%d", time.Now().UnixNano()+int64(len(items))),
			Text:     it.Text,
			Checked:  false,
			Category: it.Category,
		})
	}
	a.ChecklistItems = items
	a.ChecklistName = tpl.Name
	userID, userName := ctxUser(c)
	a.Timeline = append(a.Timeline, atendTimeline("CHECKLIST_APLICADO", userID, userName, map[string]interface{}{
		"templateId": tpl.ID, "name": tpl.Name, "items": len(items),
	}))
	a.UpdatedAt = now
	if err := h.repo.Save(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Checklist aplicado", "items": items})
}

func (h *AtendimentoHandler) UpdateChecklistItem(c *gin.Context) {
	var req struct {
		ItemID  string `json:"itemId"`
		Checked bool   `json:"checked"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	a, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}
	_, userName := ctxUser(c)
	now := time.Now().UTC()
	for i := range a.ChecklistItems {
		if a.ChecklistItems[i].ID == req.ItemID {
			a.ChecklistItems[i].Checked = req.Checked
			a.ChecklistItems[i].CheckedBy = userName
			if req.Checked {
				a.ChecklistItems[i].CheckedAt = &now
			} else {
				a.ChecklistItems[i].CheckedAt = nil
			}
			break
		}
	}
	a.UpdatedAt = now
	if err := h.repo.Save(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Item atualizado"})
}

// ── Histórico por cliente ────────────────────────────────────────────────────

func (h *AtendimentoHandler) ClientHistory(c *gin.Context) {
	clientID := c.Param("clientId")
	if clientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "clientId obrigatório"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var items []models.Atendimento
	if err := h.repo.Q(ctx).Where("client_ref->>'id' = ?", clientID).Order("open_date DESC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	total := len(items)
	openCount := 0
	closedCount := 0
	var lastDate *time.Time
	for _, a := range items {
		if a.Status == models.AtendEncerrado || a.Status == models.AtendResolvido {
			closedCount++
		} else {
			openCount++
		}
		if lastDate == nil || a.OpenDate.After(*lastDate) {
			t := a.OpenDate
			lastDate = &t
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"items":         items,
		"total":         total,
		"openCount":     openCount,
		"closedCount":   closedCount,
		"lastAtendDate": lastDate,
	})
}

// ── Dashboard / Indicadores ──────────────────────────────────────────────────

func (h *AtendimentoHandler) Dashboard(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_ = ctx

	type statusCount struct {
		Status string `json:"status"`
		Count  int    `json:"count"`
	}
	var byStatus []statusCount
	h.db.Table("atendimentos").Select("status, COUNT(*) as count").Group("status").Scan(&byStatus)

	type techCount struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Count int    `json:"count"`
	}
	var byTech []techCount
	h.db.Table("atendimentos").
		Select("technician_ref->>'id' as id, technician_ref->>'name' as name, COUNT(*) as count").
		Where("technician_ref->>'id' IS NOT NULL").
		Group("technician_ref->>'id', technician_ref->>'name'").
		Order("count DESC").
		Limit(10).
		Scan(&byTech)

	type clientCount struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Count int    `json:"count"`
	}
	var byClient []clientCount
	h.db.Table("atendimentos").
		Select("client_ref->>'id' as id, client_ref->>'name' as name, COUNT(*) as count").
		Where("client_ref->>'id' IS NOT NULL").
		Group("client_ref->>'id', client_ref->>'name'").
		Order("count DESC").
		Limit(10).
		Scan(&byClient)

	type monthCount struct {
		Month string `json:"month"`
		Count int    `json:"count"`
	}
	var byMonth []monthCount
	h.db.Table("atendimentos").
		Select("TO_CHAR(open_date, 'YYYY-MM') as month, COUNT(*) as count").
		Where("open_date >= ?", time.Now().AddDate(0, -11, 0)).
		Group("month").
		Order("month ASC").
		Scan(&byMonth)

	type causeCount struct {
		Cause string `json:"cause"`
		Count int    `json:"count"`
	}
	var byCause []causeCount
	h.db.Table("atendimentos").
		Select("identified_cause as cause, COUNT(*) as count").
		Where("identified_cause IS NOT NULL AND identified_cause <> ''").
		Group("identified_cause").
		Order("count DESC").
		Limit(10).
		Scan(&byCause)

	type equipCount struct {
		Equipment string `json:"equipment"`
		Count     int    `json:"count"`
	}
	var byEquip []equipCount
	h.db.Table("atendimentos").
		Select("equipment as equipment, COUNT(*) as count").
		Where("equipment IS NOT NULL AND equipment <> ''").
		Group("equipment").
		Order("count DESC").
		Limit(10).
		Scan(&byEquip)

	var avgResolutionMinutes float64
	h.db.Table("atendimentos").
		Select("AVG(EXTRACT(EPOCH FROM (close_date - open_date)) / 60)").
		Where("close_date IS NOT NULL").
		Scan(&avgResolutionMinutes)

	var total int64
	h.db.Table("atendimentos").Count(&total)
	var openC int64
	h.db.Table("atendimentos").Where("status NOT IN ?", []string{models.AtendEncerrado, models.AtendResolvido}).Count(&openC)
	var closedC int64
	h.db.Table("atendimentos").Where("status IN ?", []string{models.AtendEncerrado, models.AtendResolvido}).Count(&closedC)

	c.JSON(http.StatusOK, gin.H{
		"total":                 total,
		"open":                  openC,
		"closed":                closedC,
		"avgResolutionMinutes":  avgResolutionMinutes,
		"byStatus":              byStatus,
		"byTechnician":          byTech,
		"byClient":              byClient,
		"byMonth":               byMonth,
		"byCause":               byCause,
		"byEquipment":           byEquip,
	})
}

// ── Histórico por equipamento ────────────────────────────────────────────────

func (h *AtendimentoHandler) EquipmentHistory(c *gin.Context) {
	equipment := c.Query("equipment")
	serial := c.Query("serialNumber")
	if equipment == "" && serial == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Informe equipment ou serialNumber"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db := h.repo.Q(ctx)
	if equipment != "" {
		db = db.Where("equipment ILIKE ?", "%"+equipment+"%")
	}
	if serial != "" {
		db = db.Where("serial_number = ?", serial)
	}
	var items []models.Atendimento
	if err := db.Order("open_date DESC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

// ── Relatórios ───────────────────────────────────────────────────────────────

func (h *AtendimentoHandler) ReportGeneral(c *gin.Context) {
	from := c.Query("from")
	to := c.Query("to")
	clientID := c.Query("clientId")
	technicianID := c.Query("technicianId")
	status := c.Query("status")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	db := h.repo.Q(ctx)
	if from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			db = db.Where("open_date >= ?", t)
		}
	}
	if to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			db = db.Where("open_date <= ?", t.Add(24*time.Hour))
		}
	}
	if clientID != "" {
		db = db.Where("client_ref->>'id' = ?", clientID)
	}
	if technicianID != "" {
		db = db.Where("technician_ref->>'id' = ?", technicianID)
	}
	if status != "" {
		db = db.Where("status = ?", status)
	}

	var items []models.Atendimento
	if err := db.Order("open_date DESC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	var avgResolution float64
	if len(items) > 0 {
		var totalMinutes float64
		resolved := 0
		for _, a := range items {
			if a.CloseDate != nil {
				totalMinutes += a.CloseDate.Sub(a.OpenDate).Minutes()
				resolved++
			}
		}
		if resolved > 0 {
			avgResolution = totalMinutes / float64(resolved)
		}
	}

	causeCount := map[string]int{}
	solutionCount := map[string]int{}
	for _, a := range items {
		if a.IdentifiedCause != "" {
			causeCount[a.IdentifiedCause]++
		}
		if a.AppliedSolution != "" {
			solutionCount[a.AppliedSolution]++
		}
	}

	type kv struct {
		Key   string `json:"key"`
		Count int    `json:"count"`
	}
	causes := make([]kv, 0, len(causeCount))
	for k, v := range causeCount {
		causes = append(causes, kv{k, v})
	}
	sort.Slice(causes, func(i, j int) bool { return causes[i].Count > causes[j].Count })
	if len(causes) > 10 {
		causes = causes[:10]
	}
	solutions := make([]kv, 0, len(solutionCount))
	for k, v := range solutionCount {
		solutions = append(solutions, kv{k, v})
	}
	sort.Slice(solutions, func(i, j int) bool { return solutions[i].Count > solutions[j].Count })
	if len(solutions) > 10 {
		solutions = solutions[:10]
	}

	c.JSON(http.StatusOK, gin.H{
		"items":              items,
		"total":              len(items),
		"avgResolutionMins":  avgResolution,
		"topCauses":          causes,
		"topSolutions":       solutions,
	})
}

func (h *AtendimentoHandler) ReportByClient(c *gin.Context) {
	clientID := c.Param("clientId")
	if clientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "clientId obrigatório"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var client models.Client
	if err := h.clientRepo.Q(ctx).Where("id = ?", clientID).First(&client).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Cliente não encontrado"})
		return
	}
	var items []models.Atendimento
	if err := h.repo.Q(ctx).Where("client_ref->>'id' = ?", clientID).Order("open_date DESC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	equipCount := map[string]int{}
	causeCount := map[string]int{}
	solutionCount := map[string]int{}
	var totalMinutes float64
	resolved := 0
	for _, a := range items {
		if a.Equipment != "" {
			equipCount[a.Equipment]++
		}
		if a.IdentifiedCause != "" {
			causeCount[a.IdentifiedCause]++
		}
		if a.AppliedSolution != "" {
			solutionCount[a.AppliedSolution]++
		}
		if a.CloseDate != nil {
			totalMinutes += a.CloseDate.Sub(a.OpenDate).Minutes()
			resolved++
		}
	}
	avgMinutes := 0.0
	if resolved > 0 {
		avgMinutes = totalMinutes / float64(resolved)
	}

	type kv struct {
		Key   string `json:"key"`
		Count int    `json:"count"`
	}
	mapToSorted := func(m map[string]int) []kv {
		out := make([]kv, 0, len(m))
		for k, v := range m {
			out = append(out, kv{k, v})
		}
		sort.Slice(out, func(i, j int) bool { return out[i].Count > out[j].Count })
		if len(out) > 10 {
			out = out[:10]
		}
		return out
	}

	c.JSON(http.StatusOK, gin.H{
		"client":           client,
		"items":            items,
		"total":            len(items),
		"avgResolutionMins": avgMinutes,
		"topEquipments":    mapToSorted(equipCount),
		"topCauses":        mapToSorted(causeCount),
		"topSolutions":     mapToSorted(solutionCount),
	})
}

// ── Adicionar observação na timeline (genérico) ─────────────────────────────

func (h *AtendimentoHandler) AddObservation(c *gin.Context) {
	var req struct {
		Text string `json:"text"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if strings.TrimSpace(req.Text) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "text obrigatório"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	a, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Atendimento não encontrado"})
		return
	}
	userID, userName := ctxUser(c)
	a.Timeline = append(a.Timeline, atendTimeline("OBSERVACAO", userID, userName, map[string]interface{}{
		"text": req.Text,
	}))
	a.UpdatedAt = time.Now().UTC()
	if err := h.repo.Save(ctx, a); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Observação adicionada"})
}

// ── Tags disponíveis ─────────────────────────────────────────────────────────

func (h *AtendimentoHandler) ListAvailableTags(c *gin.Context) {
	_, _ = ctxUser(c)
	tags := []string{
		"Comunicação Modbus",
		"CLP",
		"Dixell",
		"Full Gauge",
		"Inversor",
		"Rede",
		"Supervisório",
		"ColdVisio",
		"XWEB",
		"SITRAD",
		"Gateway",
		"IHM",
		"Sensor",
		"Atuador",
		"Compressor",
		"Condensadora",
		"Evaporadora",
		"Comunicação Serial",
		"Ethernet",
		"WiFi",
		"Configuração",
		"Firmware",
		"Alimentação",
	}
	c.JSON(http.StatusOK, tags)
}
