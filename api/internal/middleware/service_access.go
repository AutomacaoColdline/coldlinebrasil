package middleware

import (
	"net/http"

	"coldline-api/internal/authz"
	"coldline-api/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func loadRequestUser(c *gin.Context, db *gorm.DB) (*models.User, bool) {
	userId := c.GetString("userId")
	if userId == "" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Token inválido"})
		return nil, false
	}
	var user models.User
	if err := db.First(&user, "id = ?", userId).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Usuário não encontrado"})
		return nil, false
	}
	return &user, true
}

// RequireService aborts with 403 unless the authenticated user is an admin
// or has been granted access to the given service (industria/automation/
// departamento). Must run after JWTMiddleware.
func RequireService(db *gorm.DB, service string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := loadRequestUser(c, db)
		if !ok {
			return
		}
		if !authz.HasServiceAccess(user, service) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "Você não tem acesso a este serviço"})
			return
		}
		c.Next()
	}
}

// RequireSuperAdmin restricts a route to the identification_number "0001"
// user, who is the only one allowed to manage other users' service access.
func RequireSuperAdmin(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := loadRequestUser(c, db)
		if !ok {
			return
		}
		if !authz.IsSuperAdmin(user) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "Apenas o administrador de automação pode gerenciar acessos"})
			return
		}
		c.Next()
	}
}
