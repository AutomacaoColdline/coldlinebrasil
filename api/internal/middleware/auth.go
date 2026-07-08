package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func JWTMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Token não fornecido"})
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Token inválido"})
			return
		}
		claims := token.Claims.(jwt.MapClaims)
		c.Set("userId", claims["sub"])
		c.Set("userName", claims["name"])
		c.Set("userType", claims["userType"])
		c.Set("department", claims["department"])
		c.Next()
	}
}

func GenerateToken(userID, name, userType, department, secret string) (string, error) {
	return generateTokenWithExpiry(userID, name, userType, department, secret, 30*24*time.Hour)
}

func GenerateTVToken(userID, name, userType, department, secret string) (string, error) {
	return generateTokenWithExpiry(userID, name, userType, department, secret, 30*24*time.Hour)
}

func generateTokenWithExpiry(userID, name, userType, department, secret string, expiry time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"sub":        userID,
		"name":       name,
		"userType":   userType,
		"department": department,
		"exp":        time.Now().Add(expiry).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
