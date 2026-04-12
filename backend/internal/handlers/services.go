package handlers

import (
	"context"
	"net/http"
	"strconv"

	"coldlinebrasil/internal/db"
	"coldlinebrasil/internal/models"
	"github.com/gin-gonic/gin"
)

type ServiceHandler struct {
	db *db.Database
}

func NewServiceHandler(database *db.Database) *ServiceHandler {
	return &ServiceHandler{db: database}
}

func (h *ServiceHandler) GetAll(c *gin.Context) {
	rows, err := h.db.Pool.Query(context.Background(), `
		SELECT id, name, description, icon FROM services ORDER BY id
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao buscar serviços"})
		return
	}
	defer rows.Close()

	var services []models.Service
	for rows.Next() {
		var s models.Service
		if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.Icon); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao processar serviço"})
			return
		}
		services = append(services, s)
	}

	c.JSON(http.StatusOK, services)
}

func (h *ServiceHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	var s models.Service
	err = h.db.Pool.QueryRow(context.Background(), `
		SELECT id, name, description, icon FROM services WHERE id = $1
	`, id).Scan(&s.ID, &s.Name, &s.Description, &s.Icon)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "serviço não encontrado"})
		return
	}

	c.JSON(http.StatusOK, s)
}

func (h *ServiceHandler) Create(c *gin.Context) {
	var s models.Service
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.db.Pool.QueryRow(context.Background(), `
		INSERT INTO services (name, description, icon) VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at
	`, s.Name, s.Description, s.Icon).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao criar serviço"})
		return
	}

	c.JSON(http.StatusCreated, s)
}

func (h *ServiceHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	var s models.Service
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err = h.db.Pool.Exec(context.Background(), `
		UPDATE services SET name = $1, description = $2, icon = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
	`, s.Name, s.Description, s.Icon, id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao atualizar serviço"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "serviço atualizado com sucesso"})
}

func (h *ServiceHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	_, err = h.db.Pool.Exec(context.Background(), "DELETE FROM services WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao deletar serviço"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "serviço deletado com sucesso"})
}
