package handlers

import (
	"encoding/json"
	"fmt"
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

type ClientHandler struct {
	repo *repositories.Repository[models.Client]
}

type receitaWSResponse struct {
	Status     string `json:"status"`
	Message    string `json:"message"`
	Nome       string `json:"nome"`
	Fantasia   string `json:"fantasia"`
	Logradouro string `json:"logradouro"`
	Numero     string `json:"numero"`
	Bairro     string `json:"bairro"`
	Municipio  string `json:"municipio"`
	UF         string `json:"uf"`
	CEP        string `json:"cep"`
	Telefone   string `json:"telefone"`
	Email      string `json:"email"`
}

func NewClientHandler(db *gorm.DB) *ClientHandler {
	return &ClientHandler{repo: repositories.New[models.Client](db, "clients")}
}

func (h *ClientHandler) GetAll(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	items, err := h.repo.FindAll(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *ClientHandler) GetByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	item, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Cliente não encontrado"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func onlyDigits(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func buildAddress(r receitaWSResponse) string {
	parts := []string{}
	if strings.TrimSpace(r.Logradouro) != "" {
		parts = append(parts, strings.TrimSpace(r.Logradouro))
	}
	if strings.TrimSpace(r.Numero) != "" {
		parts = append(parts, strings.TrimSpace(r.Numero))
	}
	if strings.TrimSpace(r.Bairro) != "" {
		parts = append(parts, strings.TrimSpace(r.Bairro))
	}
	cityUF := strings.TrimSpace(strings.TrimSpace(r.Municipio) + " - " + strings.TrimSpace(r.UF))
	cityUF = strings.Trim(cityUF, "- ")
	if cityUF != "" {
		parts = append(parts, cityUF)
	}
	if strings.TrimSpace(r.CEP) != "" {
		parts = append(parts, "CEP "+strings.TrimSpace(r.CEP))
	}
	return strings.Join(parts, ", ")
}

func (h *ClientHandler) LookupCNPJ(c *gin.Context) {
	cnpj := onlyDigits(c.Param("cnpj"))
	if len(cnpj) != 14 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "CNPJ inválido. Informe 14 dígitos numéricos."})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("https://receitaws.com.br/v1/cnpj/%s", cnpj), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Falha ao montar requisição de CNPJ"})
		return
	}
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": "Falha ao consultar ReceitaWS"})
		return
	}
	defer resp.Body.Close()

	var parsed receitaWSResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": "Resposta inválida da ReceitaWS"})
		return
	}
	if strings.EqualFold(parsed.Status, "ERROR") {
		msg := strings.TrimSpace(parsed.Message)
		if msg == "" {
			msg = "CNPJ não encontrado na ReceitaWS"
		}
		c.JSON(http.StatusNotFound, gin.H{"message": msg})
		return
	}

	name := strings.TrimSpace(parsed.Fantasia)
	if name == "" {
		name = strings.TrimSpace(parsed.Nome)
	}

	c.JSON(http.StatusOK, gin.H{
		"document": cnpj,
		"name":     name,
		"address":  buildAddress(parsed),
		"phone":    strings.TrimSpace(parsed.Telefone),
		"email":    strings.TrimSpace(parsed.Email),
	})
}

func (h *ClientHandler) Search(c *gin.Context) {
	q    := c.Query("q")
	page, _     := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "15"))
	if page < 1 { page = 1 }
	if pageSize < 1 || pageSize > 100 { pageSize = 15 }

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db := h.repo.Q(ctx)

	if q != "" {
		p := "%" + q + "%"
		db = db.Where("name ILIKE ? OR document ILIKE ? OR email ILIKE ? OR phone ILIKE ? OR address ILIKE ?", p, p, p, p, p)
	}

	var total int64
	db.Count(&total)

	var items []models.Client
	db.Offset((page-1)*pageSize).Limit(pageSize).Order("name ASC").Find(&items)

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages < 1 { totalPages = 1 }

	c.JSON(http.StatusOK, gin.H{
		"items": items, "page": page, "pageSize": pageSize,
		"total": total, "totalPages": totalPages,
	})
}

func (h *ClientHandler) Create(c *gin.Context) {
	var m models.Client
	if err := c.ShouldBindJSON(&m); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if m.Location == nil && strings.TrimSpace(m.Address) != "" {
		if gp, err := geocodeAddress(ctx, m.Address); err == nil && gp != nil {
			m.Location = gp
		}
	}
	if err := h.repo.Create(ctx, &m); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, m)
}

func (h *ClientHandler) Update(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, hasLoc := payload["location"]; !hasLoc {
		if addr, ok := payload["address"].(string); ok && strings.TrimSpace(addr) != "" {
			if gp, err := geocodeAddress(ctx, addr); err == nil && gp != nil {
				payload["location"] = gp
			}
		}
	}
	if err := h.repo.MergeUpdate(ctx, c.Param("id"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func (h *ClientHandler) Delete(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.repo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}
