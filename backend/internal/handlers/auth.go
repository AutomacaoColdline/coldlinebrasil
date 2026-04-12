package handlers

import (
	"context"
	"net/http"

	"coldlinebrasil/internal/auth"
	"coldlinebrasil/internal/config"
	"coldlinebrasil/internal/db"
	"coldlinebrasil/internal/models"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db     *db.Database
	config *config.Config
}

func NewAuthHandler(database *db.Database, cfg *config.Config) *AuthHandler {
	return &AuthHandler{db: database, config: cfg}
}

func (h *AuthHandler) Signup(c *gin.Context) {
	var req models.SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao criptografar senha"})
		return
	}

	_, err = h.db.Pool.Exec(context.Background(), `
		INSERT INTO users (name, email, password, role)
		VALUES ($1, $2, $3, $4)
	`, req.Name, req.Email, string(hashedPassword), "user")

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email já registrado"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "usuário registrado com sucesso"})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	err := h.db.Pool.QueryRow(context.Background(), `
		SELECT id, name, email, password, role FROM users WHERE email = $1
	`, req.Email).Scan(&user.ID, &user.Name, &user.Email, &user.Password, &user.Role)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "credenciais inválidas"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "credenciais inválidas"})
		return
	}

	token, err := auth.GenerateToken(user.ID, user.Email, user.Role, h.config.JWTSecret, h.config.JWTExpiration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "erro ao gerar token"})
		return
	}

	user.Password = "" // não retornar senha
	c.JSON(http.StatusOK, models.LoginResponse{Token: token, User: user})
}
