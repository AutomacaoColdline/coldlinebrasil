package handlers

import (
	"context"
	"net/http"
	"time"

	"coldline-api/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ColdvisioGuideHandler struct {
	db *gorm.DB
}

func NewColdvisioGuideHandler(db *gorm.DB) *ColdvisioGuideHandler {
	return &ColdvisioGuideHandler{db: db}
}

// GET /api/ColdvisioGuide — retorna todos os passos ordenados
func (h *ColdvisioGuideHandler) GetAll(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var steps []models.ColdvisioGuideStep
	if err := h.db.WithContext(ctx).
		Table("coldvisio_guide_steps").
		Order("step_order ASC").
		Find(&steps).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, steps)
}

// PUT /api/ColdvisioGuide — substitui todos os passos (salva o guia inteiro de uma vez)
func (h *ColdvisioGuideHandler) Save(c *gin.Context) {
	var steps []models.ColdvisioGuideStep
	if err := c.ShouldBindJSON(&steps); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	// Garante step_order sequencial
	for i := range steps {
		steps[i].StepOrder = i
		steps[i].ID = "" // força geração de novo UUID (o GORM vai gerar via default)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Transação: apaga tudo e re-insere
	if err := h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("1 = 1").Delete(&models.ColdvisioGuideStep{}).Error; err != nil {
			return err
		}
		if len(steps) == 0 {
			return nil
		}
		return tx.Create(&steps).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Guia salvo", "total": len(steps)})
}
