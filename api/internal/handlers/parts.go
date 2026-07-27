package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PartHandler é o catálogo de peças usado no motivo de pausa "Falta de Peça":
// pesquisável por nome, com criação inline quando o operador digita um nome
// que ainda não existe.
type PartHandler struct {
	repo *repositories.Repository[models.Part]
}

func NewPartHandler(db *gorm.DB) *PartHandler {
	return &PartHandler{repo: repositories.New[models.Part](db, "parts")}
}

func (h *PartHandler) GetAll(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	items, err := h.repo.FindAll(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *PartHandler) Search(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := h.repo.Q(ctx)
	if q != "" {
		db = db.Where("name ILIKE ?", "%"+q+"%")
	}
	var items []models.Part
	if err := db.Order("name ASC").Limit(20).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *PartHandler) Create(c *gin.Context) {
	var item models.Part
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	item.Name = strings.TrimSpace(item.Name)
	if item.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Nome da peça é obrigatório"})
		return
	}
	item.UnitOfMeasure = strings.TrimSpace(item.UnitOfMeasure)
	if item.UnitOfMeasure == "" {
		item.UnitOfMeasure = "pç"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if existing, err := h.repo.FindOne(ctx, "name ILIKE ?", item.Name); err == nil && existing != nil {
		c.JSON(http.StatusOK, existing)
		return
	}
	if err := h.repo.Create(ctx, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *PartHandler) Update(c *gin.Context) {
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

func (h *PartHandler) Delete(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

// FindOrCreateByName resolve uma peça pelo id (se enviado e existente) ou pelo
// nome, criando um novo registro em "parts" quando o nome ainda não existe.
// Usado pela pausa "Falta de Peça" para permitir digitar peças novas na hora.
func (h *PartHandler) FindOrCreateByName(ctx context.Context, id, name string) (*models.Part, error) {
	id = strings.TrimSpace(id)
	name = strings.TrimSpace(name)
	if id != "" {
		if p, err := h.repo.FindByID(ctx, id); err == nil && p != nil {
			return p, nil
		}
	}
	if name == "" {
		return nil, gorm.ErrRecordNotFound
	}
	if p, err := h.repo.FindOne(ctx, "name ILIKE ?", name); err == nil && p != nil {
		return p, nil
	}
	p := &models.Part{Name: name, UnitOfMeasure: "pç"}
	if err := h.repo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}
