package handlers

import (
	"context"
	"net/http"
	"time"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ── Generic CRUD (UserTypes, Departments, ProcessTypes, etc.) ─────────────────

type CRUDHandler struct {
	repo *repositories.Repository[models.BaseEntity]
}

func NewCRUDHandler(db *gorm.DB, table string) *CRUDHandler {
	return &CRUDHandler{repo: repositories.New[models.BaseEntity](db, table)}
}

func (h *CRUDHandler) GetAll(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	items, err := h.repo.FindAll(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *CRUDHandler) GetByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	item, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Não encontrado"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *CRUDHandler) Create(c *gin.Context) {
	var item models.BaseEntity
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.Create(ctx, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *CRUDHandler) Update(c *gin.Context) {
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

func (h *CRUDHandler) Delete(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

type DashboardHandler struct {
	db *gorm.DB
}

func NewDashboardHandler(db *gorm.DB) *DashboardHandler {
	return &DashboardHandler{db: db}
}

func (h *DashboardHandler) GetDashboard(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	db := h.db.WithContext(ctx)

	count := func(table, where string, args ...interface{}) int64 {
		var n int64
		db.Table(table).Where(where, args...).Count(&n)
		return n
	}

	var activeProcs []models.Process
	var activeOccs  []models.Occurrence
	db.Table("processes").Where("finished = ?", false).Find(&activeProcs)
	EnrichProcessesOperatorOccurrence(ctx, h.db, activeProcs)

	db.Table("occurrences").Where("finished = ?", false).Find(&activeOccs)

	c.JSON(http.StatusOK, gin.H{
		"stats": gin.H{
			"totalUsers":        count("users", "1=1"),
			"totalMachines":     count("machines", "1=1"),
			"activeMachines":    count("machines", "status = ?", 2),
			"totalProcesses":    count("processes", "1=1"),
			"activeProcesses":   count("processes", "finished = ?", false),
			"totalOccurrences":  count("occurrences", "1=1"),
			"activeOccurrences": count("occurrences", "finished = ?", false),
			"machinesInOcc":     count("machines", "status = ?", 3),
			"machinesWaiting":   count("machines", "status = ?", 1),
			"machinesFinished":  count("machines", "status = ?", 5),
		},
		"activeProcesses":   activeProcs,
		"activeOccurrences": activeOccs,
	})
}
