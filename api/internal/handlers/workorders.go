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
	"strconv"
	"strings"
	"time"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WorkOrderHandler struct {
	repo       *repositories.Repository[models.WorkOrder]
	clientRepo *repositories.Repository[models.Client]
}

func NewWorkOrderHandler(db *gorm.DB) *WorkOrderHandler {
	return &WorkOrderHandler{
		repo:       repositories.New[models.WorkOrder](db, "work_orders"),
		clientRepo: repositories.New[models.Client](db, "clients"),
	}
}

func ctxUser(c *gin.Context) (id, name string) {
	uid, _   := c.Get("userId")
	uname, _ := c.Get("userName")
	return fmt.Sprint(uid), fmt.Sprint(uname)
}

func isAdminCtx(c *gin.Context) bool {
	ut, _ := c.Get("userType")
	v := strings.ToLower(strings.TrimSpace(fmt.Sprint(ut)))
	return v == "admin" || v == "setup" || v == "administrador"
}

func isTechAssigned(wo *models.WorkOrder, userID string) bool {
	if wo == nil || userID == "" {
		return false
	}
	for _, t := range wo.Technicians {
		if t.Technician != nil && t.Technician.ID == userID {
			return true
		}
	}
	return false
}

func osTimeline(typ, userID, userName string, meta map[string]interface{}) models.TimelineEvent {
	return models.TimelineEvent{
		Type:      typ,
		Timestamp: time.Now().UTC(),
		UserID:    userID,
		UserName:  userName,
		Metadata:  meta,
	}
}

func generateOSNumber() string {
	t := time.Now()
	return fmt.Sprintf("OS-%02d%02d%02d-%04d", t.Year()%100, t.Month(), t.Day(), rand.Intn(9999))
}

func (h *WorkOrderHandler) GetAll(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db := h.repo.Q(ctx)
	if s := c.Query("status"); s != "" {
		db = db.Where("status = ?", s)
	}
	if techID := c.Query("technicianId"); techID != "" {
		db = db.Where("EXISTS (SELECT 1 FROM jsonb_array_elements(technicians) t WHERE t->'technician'->>'id' = ?)", techID)
	}
	if !isAdminCtx(c) {
		uid, _ := ctxUser(c)
		db = db.Where("EXISTS (SELECT 1 FROM jsonb_array_elements(technicians) t WHERE t->'technician'->>'id' = ?)", uid)
	}
	var items []models.WorkOrder
	if err := db.Order("created_at DESC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *WorkOrderHandler) Search(c *gin.Context) {
	page, _     := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "15"))
	if page < 1 { page = 1 }
	if pageSize < 1 || pageSize > 100 { pageSize = 15 }

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db := h.repo.Q(ctx)

	if v := c.Query("q"); v != "" {
		p := "%" + v + "%"
		db = db.Where("os_number ILIKE ? OR description ILIKE ? OR address ILIKE ? OR client_ref->>'name' ILIKE ?", p, p, p, p)
	}
	if v := c.Query("status"); v != "" {
		db = db.Where("status = ?", v)
	}
	if v := c.Query("technicianId"); v != "" {
		db = db.Where("EXISTS (SELECT 1 FROM jsonb_array_elements(technicians) t WHERE t->'technician'->>'id' = ?)", v)
	}
	if v := c.Query("clientId"); v != "" {
		db = db.Where("client_ref->>'id' = ?", v)
	}
	if !isAdminCtx(c) {
		uid, _ := ctxUser(c)
		db = db.Where("EXISTS (SELECT 1 FROM jsonb_array_elements(technicians) t WHERE t->'technician'->>'id' = ?)", uid)
	}

	var total int64
	db.Count(&total)

	var items []models.WorkOrder
	db.Offset((page-1)*pageSize).Limit(pageSize).Order("created_at DESC").Find(&items)

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages < 1 { totalPages = 1 }

	c.JSON(http.StatusOK, gin.H{
		"items": items, "page": page, "pageSize": pageSize,
		"total": total, "totalPages": totalPages,
	})
}

func (h *WorkOrderHandler) GetByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	item, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "OS não encontrada"})
		return
	}
	if !isAdminCtx(c) {
		uid, _ := ctxUser(c)
		if !isTechAssigned(item, uid) {
			c.JSON(http.StatusForbidden, gin.H{"message": "Sem permissão para visualizar esta OS"})
			return
		}
	}
	c.JSON(http.StatusOK, item)
}

func (h *WorkOrderHandler) Create(c *gin.Context) {
	if !isAdminCtx(c) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Somente admin pode criar OS"})
		return
	}
	var req struct {
		Description   string           `json:"description"`
		ClientId      string           `json:"clientId"`
		Address       string           `json:"address"`
		Location      *models.GeoPoint `json:"location"`
		AllowedRadius float64          `json:"allowedRadius"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	userID, userName := ctxUser(c)
	now := time.Now().UTC()
	radius := req.AllowedRadius
	if radius <= 0 { radius = 1000 }
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	wo := &models.WorkOrder{
		OSNumber:      generateOSNumber(),
		Description:   req.Description,
		Address:       req.Address,
		Location:      req.Location,
		AllowedRadius: radius,
		Status:        models.OSAberta,
		Technicians:   []models.TechAssignment{},
		Images:        []models.OSImage{},
		Report:        &models.OSReport{},
		Timeline:      []models.TimelineEvent{osTimeline(models.TLCriada, userID, userName, nil)},
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if req.ClientId != "" {
		ctx2, cancel2 := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel2()
		if client, err := h.clientRepo.FindByID(ctx2, req.ClientId); err == nil {
			wo.Client = &models.ReferenceEntity{ID: client.ID, Name: client.Name}
			if req.Address == "" { wo.Address = client.Address }
			if req.Location == nil { wo.Location = client.Location }
		}
	}
	if wo.Location == nil && strings.TrimSpace(wo.Address) != "" {
		if gp, err := geocodeAddress(ctx, wo.Address); err == nil && gp != nil {
			wo.Location = gp
		}
	}
	if err := h.repo.Create(ctx, wo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, wo)
}

func (h *WorkOrderHandler) Update(c *gin.Context) {
	if !isAdminCtx(c) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Somente admin pode atualizar OS"})
		return
	}
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")
	payload["updatedAt"] = time.Now().UTC()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.MergeUpdate(ctx, c.Param("id"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func (h *WorkOrderHandler) Delete(c *gin.Context) {
	if !isAdminCtx(c) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Somente admin pode deletar OS"})
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

func (h *WorkOrderHandler) AssignTechnician(c *gin.Context) {
	if !isAdminCtx(c) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Somente admin pode atribuir técnicos"})
		return
	}
	var req struct {
		TechnicianId   string `json:"technicianId"`
		TechnicianName string `json:"technicianName"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.TechnicianId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "technicianId obrigatório"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	wo, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "OS não encontrada"})
		return
	}

	userID, userName := ctxUser(c)
	wo.Technicians = append(wo.Technicians, models.TechAssignment{
		Technician: &models.ReferenceEntity{ID: req.TechnicianId, Name: req.TechnicianName},
		AssignedAt: time.Now().UTC(),
	})
	wo.Timeline = append(wo.Timeline, osTimeline(models.TLAtribuida, userID, userName, map[string]interface{}{
		"technicianId": req.TechnicianId, "technicianName": req.TechnicianName,
	}))
	wo.UpdatedAt = time.Now().UTC()

	if err := h.repo.Save(ctx, wo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Técnico atribuído"})
}

func (h *WorkOrderHandler) RemoveTechnician(c *gin.Context) {
	if !isAdminCtx(c) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Somente admin pode remover técnicos"})
		return
	}
	techID := c.Param("techId")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	wo, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "OS não encontrada"})
		return
	}

	filtered := wo.Technicians[:0]
	for _, t := range wo.Technicians {
		if t.Technician == nil || t.Technician.ID != techID {
			filtered = append(filtered, t)
		}
	}
	wo.Technicians = filtered
	wo.UpdatedAt = time.Now().UTC()

	if err := h.repo.Save(ctx, wo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Técnico removido"})
}

func (h *WorkOrderHandler) UpdateStatus(c *gin.Context) {
	if !isAdminCtx(c) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Somente admin pode alterar status manualmente"})
		return
	}
	var req struct{ Status string `json:"status"` }
	if err := c.ShouldBindJSON(&req); err != nil || req.Status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "status obrigatório"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	wo, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "OS não encontrada"})
		return
	}

	userID, userName := ctxUser(c)
	eventType := map[string]string{
		models.OSConcluida: models.TLConcluida,
		models.OSCancelada: models.TLCancelada,
	}[req.Status]
	if eventType == "" { eventType = models.TLAtualizacao }

	wo.Status = req.Status
	wo.Timeline = append(wo.Timeline, osTimeline(eventType, userID, userName, map[string]interface{}{"status": req.Status}))
	wo.UpdatedAt = time.Now().UTC()

	if err := h.repo.Save(ctx, wo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Status atualizado"})
}

type geoReq struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Accuracy  float64 `json:"accuracy"`
}

func (h *WorkOrderHandler) CheckIn(c *gin.Context) {
	var req geoReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Coordenadas obrigatórias"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	wo, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "OS não encontrada"})
		return
	}
	if wo.CheckIn != nil {
		c.JSON(http.StatusConflict, gin.H{"message": "Check-in já realizado"})
		return
	}
	if !isAdminCtx(c) {
		uid, _ := ctxUser(c)
		if !isTechAssigned(wo, uid) {
			c.JSON(http.StatusForbidden, gin.H{"message": "Sem permissão para check-in nesta OS"})
			return
		}
	}

	dist := 0.0
	outsideRadius := false
	if wo.Location != nil && len(wo.Location.Coordinates) == 2 {
		dist = models.HaversineMeters(req.Latitude, req.Longitude,
			wo.Location.Coordinates[1], wo.Location.Coordinates[0])
		outsideRadius = dist > wo.AllowedRadius
	}

	userID, userName := ctxUser(c)
	now := time.Now().UTC()
	wo.CheckIn = &models.CheckEvent{
		Timestamp:          now,
		Location:           models.NewGeoPoint(req.Latitude, req.Longitude),
		Accuracy:           req.Accuracy,
		DistanceFromTarget: dist,
		OutsideRadius:      outsideRadius,
	}
	wo.Status = models.OSEmAndamento
	wo.Timeline = append(wo.Timeline, osTimeline(models.TLCheckIn, userID, userName, map[string]interface{}{
		"distanceMeters": int(dist), "outsideRadius": outsideRadius, "accuracy": req.Accuracy,
	}))
	wo.UpdatedAt = now

	if err := h.repo.Save(ctx, wo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Check-in realizado", "distanceMeters": int(dist), "outsideRadius": outsideRadius,
	})
}

func (h *WorkOrderHandler) CheckOut(c *gin.Context) {
	var req geoReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Coordenadas obrigatórias"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	wo, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "OS não encontrada"})
		return
	}
	if wo.CheckIn == nil {
		c.JSON(http.StatusConflict, gin.H{"message": "Check-in não realizado"})
		return
	}
	if wo.CheckOut != nil {
		c.JSON(http.StatusConflict, gin.H{"message": "Check-out já realizado"})
		return
	}
	if !isAdminCtx(c) {
		uid, _ := ctxUser(c)
		if !isTechAssigned(wo, uid) {
			c.JSON(http.StatusForbidden, gin.H{"message": "Sem permissão para check-out nesta OS"})
			return
		}
	}

	dist := 0.0
	if wo.Location != nil && len(wo.Location.Coordinates) == 2 {
		dist = models.HaversineMeters(req.Latitude, req.Longitude,
			wo.Location.Coordinates[1], wo.Location.Coordinates[0])
	}

	userID, userName := ctxUser(c)
	now := time.Now().UTC()
	wo.CheckOut = &models.CheckEvent{
		Timestamp:          now,
		Location:           models.NewGeoPoint(req.Latitude, req.Longitude),
		Accuracy:           req.Accuracy,
		DistanceFromTarget: dist,
	}
	wo.Timeline = append(wo.Timeline, osTimeline(models.TLCheckOut, userID, userName, map[string]interface{}{
		"distanceMeters": int(dist),
	}))
	wo.UpdatedAt = now

	if err := h.repo.Save(ctx, wo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Check-out realizado", "distanceMeters": int(dist)})
}

func (h *WorkOrderHandler) UpdateReport(c *gin.Context) {
	var req models.OSReport
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	req.LastUpdatedAt = time.Now().UTC()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	wo, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "OS não encontrada"})
		return
	}
	if !isAdminCtx(c) {
		uid, _ := ctxUser(c)
		if !isTechAssigned(wo, uid) {
			c.JSON(http.StatusForbidden, gin.H{"message": "Sem permissão para editar relatório desta OS"})
			return
		}
	}

	userID, userName := ctxUser(c)
	wo.Report = &req
	wo.Timeline = append(wo.Timeline, osTimeline(models.TLAtualizacao, userID, userName, map[string]interface{}{"section": "relatório"}))
	wo.UpdatedAt = time.Now().UTC()

	if err := h.repo.Save(ctx, wo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Relatório salvo", "savedAt": req.LastUpdatedAt})
}

func (h *WorkOrderHandler) UploadImage(c *gin.Context) {
	annotation := c.PostForm("annotation")
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "arquivo não encontrado"})
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" { ext = ".jpg" }
	imageID := fmt.Sprintf("%d_%04d", time.Now().UnixMilli(), rand.Intn(9999))
	fileName := fmt.Sprintf("os_%s%s", imageID, ext)

	dir := "./wwwroot/uploads/os"
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

	wo, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "OS não encontrada"})
		return
	}
	if !isAdminCtx(c) {
		uid, _ := ctxUser(c)
		if !isTechAssigned(wo, uid) {
			c.JSON(http.StatusForbidden, gin.H{"message": "Sem permissão para enviar imagem nesta OS"})
			return
		}
	}

	now := time.Now().UTC()
	img := models.OSImage{
		ID:         imageID,
		URL:        fmt.Sprintf("uploads/os/%s", fileName),
		UploadedAt: now,
		Annotation: annotation,
	}
	userID, userName := ctxUser(c)
	wo.Images = append(wo.Images, img)
	wo.Timeline = append(wo.Timeline, osTimeline(models.TLImagem, userID, userName, map[string]interface{}{"fileName": fileName}))
	wo.UpdatedAt = now

	if err := h.repo.Save(ctx, wo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, img)
}

func (h *WorkOrderHandler) DeleteImage(c *gin.Context) {
	imageID := c.Param("imageId")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	wo, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "OS não encontrada"})
		return
	}
	if !isAdminCtx(c) {
		uid, _ := ctxUser(c)
		if !isTechAssigned(wo, uid) {
			c.JSON(http.StatusForbidden, gin.H{"message": "Sem permissão para remover imagem nesta OS"})
			return
		}
	}

	filtered := wo.Images[:0]
	for _, img := range wo.Images {
		if img.ID == imageID {
			os.Remove(filepath.Join("./wwwroot", img.URL))
		} else {
			filtered = append(filtered, img)
		}
	}
	wo.Images = filtered
	wo.UpdatedAt = time.Now().UTC()

	if err := h.repo.Save(ctx, wo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Imagem removida"})
}

func (h *WorkOrderHandler) UpdateImageAnnotation(c *gin.Context) {
	imageID := c.Param("imageId")
	var req struct{ Annotation string `json:"annotation"` }
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	wo, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "OS não encontrada"})
		return
	}
	if !isAdminCtx(c) {
		uid, _ := ctxUser(c)
		if !isTechAssigned(wo, uid) {
			c.JSON(http.StatusForbidden, gin.H{"message": "Sem permissão para editar anotação nesta OS"})
			return
		}
	}

	for i := range wo.Images {
		if wo.Images[i].ID == imageID {
			wo.Images[i].Annotation = req.Annotation
			break
		}
	}
	wo.UpdatedAt = time.Now().UTC()

	if err := h.repo.Save(ctx, wo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Anotação atualizada"})
}
