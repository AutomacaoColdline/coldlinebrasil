package handlers

import (
	"context"
	"encoding/json"
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

// UpsertByClient cria ou atualiza (parcialmente) o acompanhamento de pesquisa
// de um cliente. Aceita status, contactName, contactPhone, contactEmail e
// notes — campos ausentes do payload preservam o valor já salvo.
func (h *SurveyHandler) UpsertByClient(c *gin.Context) {
	clientID := c.Param("clientId")
	if clientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "clientId é obrigatório"})
		return
	}

	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if st, ok := payload["status"].(string); ok && st != "" && !validSurveyStatuses[st] {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Status inválido"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	uid, uname := ctxUser(c)
	payload["updatedBy"] = uid
	payload["updatedByName"] = uname
	payload["updatedAt"] = time.Now().UTC()

	existing, err := h.repo.FindOne(ctx, "client_id = ?", clientID)
	if err != nil {
		if err != gorm.ErrRecordNotFound {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		created := models.ClientSurvey{ClientID: clientID, Status: models.SurveyNaoContatado}
		b, err := json.Marshal(payload)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		if err := json.Unmarshal(b, &created); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		created.ClientID = clientID
		if err := h.repo.Create(ctx, &created); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, created)
		return
	}

	if err := h.repo.MergeUpdate(ctx, existing.ID, payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	updated, err := h.repo.FindByID(ctx, existing.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, updated)
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
