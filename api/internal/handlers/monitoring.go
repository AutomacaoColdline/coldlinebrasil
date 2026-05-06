package handlers

import (
	"context"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type MonitoringHandler struct {
	repo     *repositories.Repository[models.Monitoring]
	typeRepo *repositories.Repository[models.BaseEntity]
}

func NewMonitoringHandler(db *gorm.DB) *MonitoringHandler {
	return &MonitoringHandler{
		repo:     repositories.New[models.Monitoring](db, "monitorings"),
		typeRepo: repositories.New[models.BaseEntity](db, "monitoring_types"),
	}
}

func (h *MonitoringHandler) GetAll(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	items, err := h.repo.FindAll(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *MonitoringHandler) GetByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	item, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Monitoramento não encontrado"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *MonitoringHandler) Search(c *gin.Context) {
	q                := c.Query("q")
	identificador    := c.Query("identificador")
	unidade          := c.Query("unidade")
	estado           := c.Query("estado")
	cidade           := c.Query("cidade")
	monitoringTypeId := c.Query("monitoringTypeId")
	page, _     := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if page < 1 { page = 1 }
	if pageSize < 1 || pageSize > 100 { pageSize = 10 }

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db := h.repo.Q(ctx)

	if q != "" {
		pattern := "%" + q + "%"
		db = db.Where(
			"identificador ILIKE ? OR unidade ILIKE ? OR estado ILIKE ? OR cidade ILIKE ? OR ihm ILIKE ? OR gateway ILIKE ? OR id_anydesk ILIKE ? OR id_rustdesk ILIKE ? OR id_teamviewer ILIKE ? OR clp::text ILIKE ? OR macs::text ILIKE ?",
			pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern,
		)
	}
	if identificador != "" { db = db.Where("identificador ILIKE ?", "%"+identificador+"%") }
	if unidade != "" { db = db.Where("unidade ILIKE ?", "%"+unidade+"%") }
	if estado != "" { db = db.Where("estado ILIKE ?", "%"+estado+"%") }
	if cidade != "" { db = db.Where("cidade ILIKE ?", "%"+cidade+"%") }
	if monitoringTypeId != "" {
		db = db.Where("monitoring_type->>'id' = ?", monitoringTypeId)
	}

	var total int64
	db.Count(&total)

	var items []models.Monitoring
	db.Offset((page-1)*pageSize).Limit(pageSize).Order("unidade ASC").Find(&items)

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages < 1 { totalPages = 1 }

	c.JSON(http.StatusOK, gin.H{
		"items": items, "page": page, "pageSize": pageSize,
		"total": total, "totalPages": totalPages,
	})
}

func (h *MonitoringHandler) Create(c *gin.Context) {
	var m models.Monitoring
	if err := c.ShouldBindJSON(&m); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if m.CLP == nil { m.CLP = []string{} }
	if m.MACs == nil { m.MACs = []string{} }

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.Create(ctx, &m); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, m)
}

func (h *MonitoringHandler) Update(c *gin.Context) {
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

func (h *MonitoringHandler) Delete(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

func (h *MonitoringHandler) GetTypes(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	allowed := []string{"XWEB", "SITRAD", "COLDVISIO"}
	result := make([]models.BaseEntity, 0, len(allowed))
	for _, name := range allowed {
		var item models.BaseEntity
		err := h.typeRepo.Q(ctx).Where("LOWER(name) = ?", strings.ToLower(name)).First(&item).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				newItem := models.BaseEntity{Name: name}
				if createErr := h.typeRepo.Create(ctx, &newItem); createErr != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"message": createErr.Error()})
					return
				}
				item = newItem
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
				return
			}
		}
		if item.Name != name {
			item.Name = name
			if saveErr := h.typeRepo.Save(ctx, &item); saveErr != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": saveErr.Error()})
				return
			}
		}
		result = append(result, item)
	}
	c.JSON(http.StatusOK, result)
}
