package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"coldline-api/internal/authz"
	"coldline-api/internal/email"
	"coldline-api/internal/middleware"
	"coldline-api/internal/models"
	"coldline-api/internal/repositories"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserHandler struct {
	repo       *repositories.Repository[models.User]
	db         *gorm.DB
	jwtSecret  string
	emailCfg   email.Config
	appBaseURL string
}

func NewUserHandler(db *gorm.DB, jwtSecret string, emailCfg email.Config, appBaseURL string) *UserHandler {
	return &UserHandler{
		repo:       repositories.New[models.User](db, "users"),
		db:         db,
		jwtSecret:  jwtSecret,
		emailCfg:   emailCfg,
		appBaseURL: appBaseURL,
	}
}

func (h *UserHandler) GetAll(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	users, err := h.repo.FindAll(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	for i := range users {
		users[i].Password = ""
	}
	c.JSON(http.StatusOK, users)
}

func (h *UserHandler) GetByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	user, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Usuário não encontrado"})
		return
	}
	user.Password = ""
	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Dados inválidos"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	user, err := h.repo.FindOne(ctx, "email = ?", strings.ToLower(req.Email))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Email ou senha inválidos"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Email ou senha inválidos"})
		return
	}

	token, err := middleware.GenerateToken(
		user.ID,
		user.Name,
		safeRef(user.UserType),
		safeDept(user.Department),
		h.jwtSecret,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao gerar token"})
		return
	}

	user.Password = ""
	c.JSON(http.StatusOK, gin.H{"token": token, "user": user})
}

func (h *UserHandler) TVLogin(c *gin.Context) {
	id := c.Param("id")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	user, err := h.repo.FindOne(ctx, "identification_number = ?", id)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Identificação não encontrada"})
		return
	}

	token, err := middleware.GenerateTVToken(
		user.ID,
		user.Name,
		safeRef(user.UserType),
		safeDept(user.Department),
		h.jwtSecret,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao gerar token"})
		return
	}

	user.Password = ""
	c.JSON(http.StatusOK, gin.H{"token": token, "user": user})
}

// DefaultNewUserPassword is the password assigned to users created without an
// explicit password (e.g. via the Controle de Acessos "Novo Usuário" modal).
// They're forced to change it on first login (MustChangePassword).
const DefaultNewUserPassword = "12345678"

func (h *UserHandler) Create(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	if user.Password == "" {
		user.Password = DefaultNewUserPassword
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao processar senha"})
		return
	}
	user.Password = string(hashed)
	user.MustChangePassword = true

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := h.repo.Create(ctx, &user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	user.Password = ""
	c.JSON(http.StatusCreated, user)
}

func (h *UserHandler) Update(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")

	if pwd, ok := payload["password"].(string); ok && pwd != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao processar senha"})
			return
		}
		payload["password"] = string(hashed)
	} else {
		delete(payload, "password")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := h.repo.MergeUpdate(ctx, c.Param("id"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado com sucesso"})
}

func (h *UserHandler) UpdateServices(c *gin.Context) {
	var req struct {
		Services []string `json:"services"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Dados inválidos"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := h.repo.MergeUpdate(ctx, c.Param("id"), map[string]interface{}{
		"allowedServices": req.Services,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Acessos atualizados com sucesso"})
}

func (h *UserHandler) Delete(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	user, err := h.repo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Usuário não encontrado"})
		return
	}
	if user.IdentificationNumber == authz.SuperAdminIdentification {
		c.JSON(http.StatusForbidden, gin.H{"message": "O admin master não pode ser excluído"})
		return
	}

	if err := h.repo.Delete(ctx, c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado com sucesso"})
}

// ChangePassword lets an authenticated user set their own new password,
// confirming the current one first. Clears MustChangePassword on success -
// used both for the forced first-login flow and voluntary changes later.
func (h *UserHandler) ChangePassword(c *gin.Context) {
	var req struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.NewPassword == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Dados inválidos"})
		return
	}

	userID, _ := c.Get("userId")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	user, err := h.repo.FindByID(ctx, userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Usuário não encontrado"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
		// 400, não 401: isso é uma falha de validação dentro de uma sessão já
		// autenticada. Um 401 aqui aciona o interceptor global do axios, que
		// trata qualquer 401 como sessão inválida e força logout + redirect
		// para /login — errar a senha atual não deveria derrubar a sessão.
		c.JSON(http.StatusBadRequest, gin.H{"message": "Senha atual incorreta"})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao processar senha"})
		return
	}

	// Update direto na tabela (não repo.MergeUpdate): MergeUpdate faz
	// json.Marshal/Unmarshal usando as tags JSON do struct (camelCase), então
	// uma chave "must_change_password" nunca bateria com a tag
	// "mustChangePassword" e o campo silenciosamente não seria atualizado.
	if err := h.db.WithContext(ctx).Table("users").Where("id = ?", user.ID).Updates(map[string]interface{}{
		"password":             string(hashed),
		"must_change_password": false,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Senha atualizada com sucesso"})
}

// AdminSetPassword lets the super admin reset any user's password. The
// target is forced to change it again on their next login.
func (h *UserHandler) AdminSetPassword(c *gin.Context) {
	var req struct {
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Senha é obrigatória"})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao processar senha"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := h.db.WithContext(ctx).Table("users").Where("id = ?", c.Param("id")).Updates(map[string]interface{}{
		"password":             string(hashed),
		"must_change_password": true,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Senha redefinida com sucesso"})
}

// generateResetToken produz um token opaco de alta entropia (32 bytes,
// hex) para o link de "esqueci minha senha".
func generateResetToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// ForgotPassword gera um token de redefinição e envia por email, se o email
// existir. Sempre responde com a mesma mensagem genérica, exista ou não a
// conta, para não permitir enumerar quais emails estão cadastrados.
func (h *UserHandler) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Email) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Email é obrigatório"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	genericMsg := gin.H{"message": "Se o email existir, você receberá um link de recuperação em instantes"}

	user, err := h.repo.FindOne(ctx, "email = ?", strings.ToLower(strings.TrimSpace(req.Email)))
	if err != nil {
		c.JSON(http.StatusOK, genericMsg)
		return
	}

	token, err := generateResetToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao gerar token"})
		return
	}
	expiresAt := time.Now().Add(1 * time.Hour)

	if err := h.db.WithContext(ctx).Table("users").Where("id = ?", user.ID).Updates(map[string]interface{}{
		"password_reset_token":      token,
		"password_reset_expires_at": expiresAt,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	resetLink := fmt.Sprintf("%s/redefinir-senha?token=%s", h.appBaseURL, token)
	body := fmt.Sprintf(
		`<p>Olá, %s.</p><p>Recebemos um pedido para redefinir sua senha no sistema Coldline Brasil.</p>`+
			`<p><a href="%s">Clique aqui para criar uma nova senha</a></p>`+
			`<p>Esse link expira em 1 hora. Se você não pediu essa troca, pode ignorar este email.</p>`,
		user.Name, resetLink,
	)

	if err := email.Send(h.emailCfg, []string{user.Email}, "Recuperação de senha - Coldline Brasil", body); err != nil {
		log.Printf("❌ Erro ao enviar email de recuperação para %s: %v", user.Email, err)
	}

	c.JSON(http.StatusOK, genericMsg)
}

// ResetPassword troca a senha a partir de um token válido e não expirado
// emitido por ForgotPassword. Consome o token (limpa após uso).
func (h *UserHandler) ResetPassword(c *gin.Context) {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"newPassword"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Token == "" || req.NewPassword == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Dados inválidos"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	user, err := h.repo.FindOne(ctx, "password_reset_token = ?", req.Token)
	if err != nil || user.PasswordResetExpiresAt == nil || user.PasswordResetExpiresAt.Before(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Link inválido ou expirado"})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Erro ao processar senha"})
		return
	}

	if err := h.db.WithContext(ctx).Table("users").Where("id = ?", user.ID).Updates(map[string]interface{}{
		"password":                  string(hashed),
		"must_change_password":      false,
		"password_reset_token":      "",
		"password_reset_expires_at": nil,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Senha redefinida com sucesso"})
}

func (h *UserHandler) Search(c *gin.Context) {
	q := c.Query("q")
	name := c.Query("name")
	identNum := c.Query("identificationNumber")
	departmentId := c.Query("departmentId")
	userTypeId := c.Query("userTypeId")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := h.repo.Q(ctx)

	if q != "" {
		db = db.Where("name ILIKE ? OR email ILIKE ? OR identification_number ILIKE ?",
			"%"+q+"%", "%"+q+"%", "%"+q+"%")
	}
	if name != "" {
		db = db.Where("name ILIKE ?", "%"+name+"%")
	}
	if identNum != "" {
		db = db.Where("identification_number ILIKE ?", "%"+identNum+"%")
	}
	if departmentId != "" {
		db = db.Where("department->>'id' = ?", departmentId)
	}
	if userTypeId != "" {
		db = db.Where("user_type->>'id' = ?", userTypeId)
	}

	var total int64
	db.Count(&total)

	var users []models.User
	db.Offset((page - 1) * pageSize).Limit(pageSize).Order("name ASC").Find(&users)

	for i := range users {
		users[i].Password = ""
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages < 1 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, gin.H{
		"items": users, "page": page, "pageSize": pageSize,
		"total": total, "totalPages": totalPages,
	})
}

func (h *UserHandler) UploadImage(c *gin.Context) {
	oldFileName := c.Query("oldFileName")
	newFileName := c.Query("newFileName")
	if newFileName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "newFileName obrigatório"})
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "arquivo não encontrado"})
		return
	}
	defer file.Close()

	dir := "./wwwroot/uploads"
	if err := os.MkdirAll(dir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "erro ao criar diretório"})
		return
	}

	if oldFileName != "" && oldFileName != newFileName {
		os.Remove(filepath.Join(dir, oldFileName))
	}

	dst, err := os.Create(filepath.Join(dir, newFileName))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "erro ao salvar arquivo"})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "erro ao gravar arquivo"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"fileName": newFileName})
}

func (h *UserHandler) ListIdentifications(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	users, err := h.repo.FindAll(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	type mini struct {
		Name string `json:"name"`
		ID   string `json:"identificationNumber"`
		Type string `json:"userType"`
	}
	result := make([]mini, 0, len(users))
	for _, u := range users {
		result = append(result, mini{
			Name: u.Name,
			ID:   u.IdentificationNumber,
			Type: func() string {
				if u.UserType != nil {
					return u.UserType.Name
				}
				return ""
			}(),
		})
	}
	c.JSON(http.StatusOK, result)
}

func safeRef(r *models.ReferenceEntity) string {
	if r == nil {
		return ""
	}
	if r.ID != "" {
		return r.ID
	}
	return r.Name
}

func safeDept(r *models.ReferenceEntity) string {
	if r == nil {
		return ""
	}
	return r.Name
}
