package handlers

import (
	"context"
	"io"
	"net/http"
	"strings"
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

func normalizedGuideProduct(value string) string {
	product := strings.ToLower(strings.TrimSpace(value))
	switch product {
	case "", "coldvisio":
		return "coldvisio"
	case "xweb", "sitrad":
		return product
	default:
		return ""
	}
}

func productGuideQuery(db *gorm.DB, product string) *gorm.DB {
	if product == "coldvisio" {
		return db.Where("product = ? OR product = '' OR product IS NULL", product)
	}
	return db.Where("product = ?", product)
}

func (h *ColdvisioGuideHandler) GetAll(c *gin.Context) {
	product := normalizedGuideProduct(c.DefaultQuery("product", "coldvisio"))
	if product == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Produto invalido"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var steps []models.ColdvisioGuideStep
	if err := productGuideQuery(h.db.WithContext(ctx), product).
		Order("step_order ASC").
		Find(&steps).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, steps)
}

func (h *ColdvisioGuideHandler) Save(c *gin.Context) {
	product := normalizedGuideProduct(c.DefaultQuery("product", "coldvisio"))
	if product == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Produto invalido"})
		return
	}

	var steps []models.ColdvisioGuideStep
	if err := c.ShouldBindJSON(&steps); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	for i := range steps {
		steps[i].StepOrder = i
		steps[i].Product = product
		steps[i].ID = ""
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		deleteQuery := tx.Where("product = ?", product)
		if product == "coldvisio" {
			deleteQuery = tx.Where("product = ? OR product = '' OR product IS NULL", product)
		}
		if err := deleteQuery.Delete(&models.ColdvisioGuideStep{}).Error; err != nil {
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

func (h *ColdvisioGuideHandler) ListUpdates(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var entries []models.ColdvisioUpdateEntry
	if err := h.db.WithContext(ctx).
		Omit("file_data").
		Preload("Files", func(db *gorm.DB) *gorm.DB {
			return db.Omit("file_data").Order("created_at ASC")
		}).
		Order("created_at DESC").
		Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, entries)
}

func (h *ColdvisioGuideHandler) CreateUpdate(c *gin.Context) {
	if err := c.Request.ParseMultipartForm(256 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	headers := c.Request.MultipartForm.File["files"]
	if len(headers) == 0 {
		headers = c.Request.MultipartForm.File["file"]
	}
	if len(headers) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Arquivo obrigatorio"})
		return
	}

	baseVersion := strings.TrimSpace(c.PostForm("version"))
	baseTitle := strings.TrimSpace(c.PostForm("title"))
	baseNotes := strings.TrimSpace(c.PostForm("notes"))
	entry := models.ColdvisioUpdateEntry{
		Version: baseVersion,
		Title:   baseTitle,
		Notes:   baseNotes,
	}

	for _, header := range headers {
		file, err := header.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}

		data, err := io.ReadAll(file)
		file.Close()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}

		contentType := header.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		updateFile := models.ColdvisioUpdateFile{
			FileName:    header.Filename,
			ContentType: contentType,
			FileSize:    header.Size,
			FileData:    data,
		}
		if updateFile.FileSize <= 0 {
			updateFile.FileSize = int64(len(data))
		}
		if entry.Title == "" {
			entry.Title = updateFile.FileName
		}
		if entry.FileName == "" {
			entry.FileName = updateFile.FileName
			entry.ContentType = updateFile.ContentType
			entry.FileSize = updateFile.FileSize
			entry.FileData = updateFile.FileData
		}
		entry.Files = append(entry.Files, updateFile)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := h.db.WithContext(ctx).Create(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	entry.FileData = nil
	for i := range entry.Files {
		entry.Files[i].FileData = nil
	}
	c.JSON(http.StatusCreated, entry)
}

func (h *ColdvisioGuideHandler) DownloadUpdate(c *gin.Context) {
	var entry models.ColdvisioUpdateEntry
	if err := h.db.First(&entry, "id = ?", c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Arquivo nao encontrado"})
		return
	}

	fileName := strings.ReplaceAll(entry.FileName, `"`, "")
	c.Header("Content-Disposition", `attachment; filename="`+fileName+`"`)
	c.Data(http.StatusOK, entry.ContentType, entry.FileData)
}

func (h *ColdvisioGuideHandler) DownloadUpdateFile(c *gin.Context) {
	var file models.ColdvisioUpdateFile
	if err := h.db.First(&file, "id = ? AND entry_id = ?", c.Param("fileId"), c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Arquivo nao encontrado"})
		return
	}

	fileName := strings.ReplaceAll(file.FileName, `"`, "")
	c.Header("Content-Disposition", `attachment; filename="`+fileName+`"`)
	c.Data(http.StatusOK, file.ContentType, file.FileData)
}

func (h *ColdvisioGuideHandler) DeleteUpdate(c *gin.Context) {
	if err := h.db.Delete(&models.ColdvisioUpdateEntry{}, "id = ?", c.Param("id")).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Registro removido"})
}
