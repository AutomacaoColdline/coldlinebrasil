package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ProductionHandler cobre o módulo Produção do Departamento de Informação:
// os 4 modelos de equipamento, suas listas de materiais (padrão e por
// unidade de cliente) e o dashboard de divergências entre o BOM padrão e o
// BOM efetivamente montado para cada cliente.
type ProductionHandler struct {
	db        *gorm.DB
	modelRepo *repositories.Repository[models.ProductionModel]
	bomRepo   *repositories.Repository[models.ProductionBomItem]
	buildRepo *repositories.Repository[models.ProductionClientBuild]
	partRepo  *repositories.Repository[models.Part]
}

func NewProductionHandler(db *gorm.DB) *ProductionHandler {
	return &ProductionHandler{
		db:        db,
		modelRepo: repositories.New[models.ProductionModel](db, "production_models"),
		bomRepo:   repositories.New[models.ProductionBomItem](db, "production_bom_items"),
		buildRepo: repositories.New[models.ProductionClientBuild](db, "production_client_builds"),
		partRepo:  repositories.New[models.Part](db, "parts"),
	}
}

// --- Modelos de equipamento ---

func (h *ProductionHandler) GetModels(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var items []models.ProductionModel
	if err := h.modelRepo.Q(ctx).Order("name ASC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *ProductionHandler) GetModelByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	item, err := h.modelRepo.FindByID(ctx, c.Param("modelId"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Modelo não encontrado"})
		return
	}
	c.JSON(http.StatusOK, item)
}

// --- Lista de materiais (BOM) ---

type bomItemDTO struct {
	ID                 string  `json:"id"`
	ProductionModelID  string  `json:"productionModelId"`
	Variant            string  `json:"variant"`
	ClientBuildID      *string `json:"clientBuildId"`
	PartID             string  `json:"partId"`
	Quantity           float64 `json:"quantity"`
	PartName           string  `json:"partName"`
	UnitOfMeasure      string  `json:"unitOfMeasure"`
	InternalCode       string  `json:"internalCode"`
	Supplier           string  `json:"supplier"`
}

func (h *ProductionHandler) enrichBomItems(ctx context.Context, items []models.ProductionBomItem) []bomItemDTO {
	partIDs := make([]string, 0, len(items))
	seen := map[string]struct{}{}
	for _, item := range items {
		if _, ok := seen[item.PartID]; ok || item.PartID == "" {
			continue
		}
		seen[item.PartID] = struct{}{}
		partIDs = append(partIDs, item.PartID)
	}

	partByID := map[string]models.Part{}
	if len(partIDs) > 0 {
		var parts []models.Part
		h.partRepo.Q(ctx).Where("id IN ?", partIDs).Find(&parts)
		for _, part := range parts {
			partByID[part.ID] = part
		}
	}

	dtos := make([]bomItemDTO, 0, len(items))
	for _, item := range items {
		part := partByID[item.PartID]
		dtos = append(dtos, bomItemDTO{
			ID:                item.ID,
			ProductionModelID: item.ProductionModelID,
			Variant:           item.Variant,
			ClientBuildID:     item.ClientBuildID,
			PartID:            item.PartID,
			Quantity:          item.Quantity,
			PartName:          part.Name,
			UnitOfMeasure:     part.UnitOfMeasure,
			InternalCode:      part.InternalCode,
			Supplier:          part.Supplier,
		})
	}
	return dtos
}

func (h *ProductionHandler) GetModelBom(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var items []models.ProductionBomItem
	if err := h.bomRepo.Q(ctx).
		Where("production_model_id = ? AND variant = ?", c.Param("modelId"), "standard").
		Order("created_at ASC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": h.enrichBomItems(ctx, items)})
}

func (h *ProductionHandler) CreateModelBomItem(c *gin.Context) {
	var payload struct {
		PartID   string  `json:"partId"`
		Quantity float64 `json:"quantity"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if strings.TrimSpace(payload.PartID) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "partId é obrigatório"})
		return
	}

	item := models.ProductionBomItem{
		ProductionModelID: c.Param("modelId"),
		Variant:            "standard",
		PartID:              payload.PartID,
		Quantity:            payload.Quantity,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.bomRepo.Create(ctx, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *ProductionHandler) GetBuildBom(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var items []models.ProductionBomItem
	if err := h.bomRepo.Q(ctx).
		Where("client_build_id = ? AND variant = ?", c.Param("buildId"), "client").
		Order("created_at ASC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": h.enrichBomItems(ctx, items)})
}

func (h *ProductionHandler) CreateBuildBomItem(c *gin.Context) {
	var payload struct {
		PartID   string  `json:"partId"`
		Quantity float64 `json:"quantity"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	if strings.TrimSpace(payload.PartID) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "partId é obrigatório"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	buildID := c.Param("buildId")
	build, err := h.buildRepo.FindByID(ctx, buildID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Pedido não encontrado"})
		return
	}

	item := models.ProductionBomItem{
		ProductionModelID: build.ProductionModelID,
		Variant:            "client",
		ClientBuildID:       &buildID,
		PartID:              payload.PartID,
		Quantity:            payload.Quantity,
	}
	if err := h.bomRepo.Create(ctx, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *ProductionHandler) UpdateBomItem(c *gin.Context) {
	updateSimpleResource(c, h.bomRepo)
}

func (h *ProductionHandler) DeleteBomItem(c *gin.Context) {
	deleteSimpleResource(c, h.bomRepo)
}

// --- Modelo Criado ao Cliente (unidades físicas de um pedido) ---

func (h *ProductionHandler) GetBuilds(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var items []models.ProductionClientBuild
	if err := h.buildRepo.Q(ctx).
		Where("production_model_id = ?", c.Param("modelId")).
		Order("created_at DESC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *ProductionHandler) CreateBuild(c *gin.Context) {
	var item models.ProductionClientBuild
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	item.ProductionModelID = c.Param("modelId")
	if strings.TrimSpace(item.ClientName) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Cliente ou estoque é obrigatório"})
		return
	}
	if strings.TrimSpace(item.SerialNumber) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Número de série é obrigatório"})
		return
	}
	if strings.TrimSpace(item.Status) == "" {
		item.Status = "Em Andamento"
	}
	if item.EvaporatorAddresses == nil {
		item.EvaporatorAddresses = []models.EvaporatorAddressEntry{}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.buildRepo.Create(ctx, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *ProductionHandler) GetBuildByID(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	item, err := h.buildRepo.FindByID(ctx, c.Param("buildId"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Unidade não encontrada"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *ProductionHandler) UpdateBuild(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	delete(payload, "id")
	delete(payload, "productionModelId")

	if status, ok := payload["status"].(string); ok {
		status = strings.TrimSpace(status)
		valid := false
		for _, s := range models.ProductionBuildStatuses {
			if s == status {
				valid = true
				break
			}
		}
		if !valid {
			c.JSON(http.StatusBadRequest, gin.H{"message": "status inválido"})
			return
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := h.buildRepo.MergeUpdate(ctx, c.Param("buildId"), payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Atualizado"})
}

func (h *ProductionHandler) DeleteBuild(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	buildID := c.Param("buildId")
	if err := h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Table("production_bom_items").Where("client_build_id = ?", buildID).Delete(&models.ProductionBomItem{}).Error; err != nil {
			return err
		}
		return tx.Table("production_client_builds").Where("id = ?", buildID).Delete(&models.ProductionClientBuild{}).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deletado"})
}

// --- Dashboard de divergências ---

type dashboardDivergenceDTO struct {
	PartID                     string  `json:"partId"`
	PartName                   string  `json:"partName"`
	InternalCode               string  `json:"internalCode"`
	Supplier                   string  `json:"supplier"`
	UnitOfMeasure              string  `json:"unitOfMeasure"`
	Occurrences                int     `json:"occurrences"`
	TotalQuantityOutOfStandard float64 `json:"totalQuantityOutOfStandard"`
}

func (h *ProductionHandler) GetDashboard(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	var builds []models.ProductionClientBuild
	if err := h.buildRepo.Q(ctx).Find(&builds).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	var bomItems []models.ProductionBomItem
	if err := h.bomRepo.Q(ctx).Find(&bomItems).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	standardByModel := map[string]map[string]float64{}
	clientByBuild := map[string]map[string]float64{}
	for _, item := range bomItems {
		if item.Variant == "standard" {
			if standardByModel[item.ProductionModelID] == nil {
				standardByModel[item.ProductionModelID] = map[string]float64{}
			}
			standardByModel[item.ProductionModelID][item.PartID] += item.Quantity
		} else if item.Variant == "client" && item.ClientBuildID != nil {
			buildID := *item.ClientBuildID
			if clientByBuild[buildID] == nil {
				clientByBuild[buildID] = map[string]float64{}
			}
			clientByBuild[buildID][item.PartID] += item.Quantity
		}
	}

	divergentPartIDs := map[string]struct{}{}
	buildsWithDivergence := map[string]struct{}{}
	totalsByPart := map[string]*dashboardDivergenceDTO{}
	var totalQuantityOutOfStandard float64

	for _, build := range builds {
		standardQtys := standardByModel[build.ProductionModelID]
		clientQtys := clientByBuild[build.ID]

		partIDs := map[string]struct{}{}
		for partID := range standardQtys {
			partIDs[partID] = struct{}{}
		}
		for partID := range clientQtys {
			partIDs[partID] = struct{}{}
		}

		for partID := range partIDs {
			delta := clientQtys[partID] - standardQtys[partID]
			if delta == 0 {
				continue
			}
			divergentPartIDs[partID] = struct{}{}
			buildsWithDivergence[build.ID] = struct{}{}
			absDelta := delta
			if absDelta < 0 {
				absDelta = -absDelta
			}
			totalQuantityOutOfStandard += absDelta

			entry, ok := totalsByPart[partID]
			if !ok {
				entry = &dashboardDivergenceDTO{PartID: partID}
				totalsByPart[partID] = entry
			}
			entry.Occurrences++
			entry.TotalQuantityOutOfStandard += absDelta
		}
	}

	partIDs := make([]string, 0, len(totalsByPart))
	for partID := range totalsByPart {
		partIDs = append(partIDs, partID)
	}
	if len(partIDs) > 0 {
		var parts []models.Part
		h.partRepo.Q(ctx).Where("id IN ?", partIDs).Find(&parts)
		for _, part := range parts {
			if entry, ok := totalsByPart[part.ID]; ok {
				entry.PartName = part.Name
				entry.InternalCode = part.InternalCode
				entry.Supplier = part.Supplier
				entry.UnitOfMeasure = part.UnitOfMeasure
			}
		}
	}

	items := make([]dashboardDivergenceDTO, 0, len(totalsByPart))
	for _, entry := range totalsByPart {
		items = append(items, *entry)
	}
	sortDivergencesByQuantityDesc(items)

	c.JSON(http.StatusOK, gin.H{
		"totalDivergentMaterials":    len(divergentPartIDs),
		"totalBuildsWithDivergence":  len(buildsWithDivergence),
		"totalQuantityOutOfStandard": totalQuantityOutOfStandard,
		"items":                      items,
	})
}

func sortDivergencesByQuantityDesc(items []dashboardDivergenceDTO) {
	for i := 1; i < len(items); i++ {
		for j := i; j > 0 && items[j].TotalQuantityOutOfStandard > items[j-1].TotalQuantityOutOfStandard; j-- {
			items[j], items[j-1] = items[j-1], items[j]
		}
	}
}

// --- Catálogo de peças (reaproveitado do módulo Indústria, gated por
// departamentoAccess em vez de industriaAccess para não alterar o controle
// de acesso do módulo Indústria) ---

func (h *ProductionHandler) SearchParts(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db := h.partRepo.Q(ctx)
	if q != "" {
		db = db.Where("name ILIKE ? OR internal_code ILIKE ?", "%"+q+"%", "%"+q+"%")
	}
	var items []models.Part
	if err := db.Order("name ASC").Limit(20).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *ProductionHandler) CreatePart(c *gin.Context) {
	var item models.Part
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	item.Name = strings.TrimSpace(item.Name)
	if item.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Nome do material é obrigatório"})
		return
	}
	item.UnitOfMeasure = strings.TrimSpace(item.UnitOfMeasure)
	if item.UnitOfMeasure == "" {
		item.UnitOfMeasure = "pç"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if existing, err := h.partRepo.FindOne(ctx, "name ILIKE ?", item.Name); err == nil && existing != nil {
		c.JSON(http.StatusOK, existing)
		return
	}
	if err := h.partRepo.Create(ctx, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *ProductionHandler) UpdatePart(c *gin.Context) {
	updateSimpleResource(c, h.partRepo)
}
