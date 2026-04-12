package handlers

import (
	"context"
	"net/http"

	"coldlinebrasil/internal/db"
	"coldlinebrasil/internal/models"
	"github.com/gin-gonic/gin"
)

type ContactHandler struct {
	db *db.Database
}

func NewContactHandler(database *db.Database) *ContactHandler {
	return &ContactHandler{db: database}
}

func (h *ContactHandler) CreateContact(c *gin.Context) {
	var contact models.Contact
	if err := c.ShouldBindJSON(&contact); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.db.Pool.QueryRow(context.Background(), `
		INSERT INTO contacts (name, email, phone, message) VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`, contact.Name, contact.Email, contact.Phone, contact.Message).Scan(&contact.ID, &contact.CreatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao salvar contato"})
		return
	}

	c.JSON(http.StatusCreated, contact)
}

func (h *ContactHandler) GetAll(c *gin.Context) {
	rows, err := h.db.Pool.Query(context.Background(), `
		SELECT id, name, email, phone, message, created_at FROM contacts ORDER BY created_at DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao buscar contatos"})
		return
	}
	defer rows.Close()

	var contacts []models.Contact
	for rows.Next() {
		var c models.Contact
		if err := rows.Scan(&c.ID, &c.Name, &c.Email, &c.Phone, &c.Message, &c.CreatedAt); err != nil {
			continue
		}
		contacts = append(contacts, c)
	}

	if contacts == nil {
		contacts = []models.Contact{}
	}

	c.JSON(http.StatusOK, contacts)
}
