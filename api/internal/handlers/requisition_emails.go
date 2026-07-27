package handlers

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var requisitionEmailRegex = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

// RequisitionEmailHandler é a lista de e-mails (Configurações > Emails de
// Requisição) que recebem a notificação quando uma pausa "Falta de Peça" é
// registrada. O endereço fica no campo Name; Description é um rótulo livre
// opcional (ex.: "Compras", "Fulano - Almoxarifado").
type RequisitionEmailHandler struct {
	repo *repositories.Repository[models.BaseEntity]
}

func NewRequisitionEmailHandler(db *gorm.DB) *RequisitionEmailHandler {
	return &RequisitionEmailHandler{repo: repositories.New[models.BaseEntity](db, "requisition_emails")}
}

func (h *RequisitionEmailHandler) GetAll(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	items, err := h.repo.FindAll(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *RequisitionEmailHandler) Create(c *gin.Context) {
	var item models.BaseEntity
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	item.Name = strings.TrimSpace(item.Name)
	if !requisitionEmailRegex.MatchString(item.Name) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Informe um email válido"})
		return
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

func (h *RequisitionEmailHandler) Update(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")
	if rawName, ok := payload["name"]; ok {
		name := strings.TrimSpace(fmt.Sprint(rawName))
		if !requisitionEmailRegex.MatchString(name) {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Informe um email válido"})
			return
		}
		payload["name"] = name
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.MergeUpdate(ctx, c.Param("id"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func (h *RequisitionEmailHandler) Delete(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}
