package handlers

import (
	"context"
	"math"
	"net/http"
	"strconv"
	"time"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type NoteHandler struct {
	repo *repositories.Repository[models.Note]
}

func NewNoteHandler(db *gorm.DB) *NoteHandler {
	return &NoteHandler{repo: repositories.New[models.Note](db, "notes")}
}

func (h *NoteHandler) GetAll(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	notes, err := h.repo.FindAll(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, notes)
}

func (h *NoteHandler) GetByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	note, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Nota não encontrada"})
		return
	}
	c.JSON(http.StatusOK, note)
}

func (h *NoteHandler) Search(c *gin.Context) {
	name     := c.Query("name")
	element  := c.Query("element")
	noteType := c.Query("noteType")
	page, _     := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if page < 1 { page = 1 }
	if pageSize < 1 || pageSize > 100 { pageSize = 10 }

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db := h.repo.Q(ctx)

	if name != "" {
		db = db.Where("name ILIKE ?", "%"+name+"%")
	}
	if element != "" {
		db = db.Where("element::text ILIKE ?", "%"+element+"%")
	}
	if noteType != "" {
		if nt, err := strconv.Atoi(noteType); err == nil {
			db = db.Where("note_type = ?", nt)
		}
	}

	var total int64
	db.Count(&total)

	var notes []models.Note
	db.Offset((page-1)*pageSize).Limit(pageSize).Order("name ASC").Find(&notes)

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages < 1 { totalPages = 1 }

	c.JSON(http.StatusOK, gin.H{
		"items": notes, "page": page, "pageSize": pageSize,
		"total": total, "totalPages": totalPages,
	})
}

func (h *NoteHandler) Create(c *gin.Context) {
	var note models.Note
	if err := c.ShouldBindJSON(&note); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if note.Element == nil { note.Element = []string{} }

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.Create(ctx, &note); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, note)
}

func (h *NoteHandler) Update(c *gin.Context) {
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

func (h *NoteHandler) Delete(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}
