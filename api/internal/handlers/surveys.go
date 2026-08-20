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

type SurveyHandler struct {
	repo *repositories.Repository[models.ClientSurvey]
}

func NewSurveyHandler(db *gorm.DB) *SurveyHandler {
	return &SurveyHandler{repo: repositories.New[models.ClientSurvey](db, "client_surveys")}
}

var validSurveyStatuses = map[string]bool{
	models.SurveyNaoContatado:       true,
	models.SurveyContatoRealizado:   true,
	models.SurveyAguardandoResposta: true,
	models.SurveySemRetorno:         true,
	models.SurveyRespondida:         true,
}

// GetAll lista todos os registros de acompanhamento de pesquisa (um por cliente).
func (h *SurveyHandler) GetAll(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	items, err := h.repo.FindAll(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

type surveyUpsertPayload struct {
	Status models.ClientSurveyStatus `json:"status"`
	Notes  string                    `json:"notes"`
}

// UpsertByClient cria ou atualiza o status de pesquisa de um cliente.
func (h *SurveyHandler) UpsertByClient(c *gin.Context) {
	clientID := c.Param("clientId")
	if clientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "clientId é obrigatório"})
		return
	}

	var payload surveyUpsertPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if payload.Status != "" && !validSurveyStatuses[payload.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Status inválido"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	uid, uname := ctxUser(c)

	existing, err := h.repo.FindOne(ctx, "client_id = ?", clientID)
	if err != nil {
		if err != gorm.ErrRecordNotFound {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		created := models.ClientSurvey{
			ClientID:      clientID,
			Status:        payload.Status,
			Notes:         payload.Notes,
			UpdatedBy:     uid,
			UpdatedByName: uname,
			UpdatedAt:     time.Now().UTC(),
		}
		if created.Status == "" {
			created.Status = models.SurveyNaoContatado
		}
		if err := h.repo.Create(ctx, &created); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, created)
		return
	}

	if payload.Status != "" {
		existing.Status = payload.Status
	}
	existing.Notes = payload.Notes
	existing.UpdatedBy = uid
	existing.UpdatedByName = uname
	existing.UpdatedAt = time.Now().UTC()

	if err := h.repo.Save(ctx, existing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, existing)
}

func (h *SurveyHandler) Delete(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}
