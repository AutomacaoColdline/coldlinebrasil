package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"coldline-api/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

// Import/export de BOM em planilha Excel (.xlsx) para o BOM padrao de um
// modelo e para o BOM de um "Modelo Criado ao Cliente". Mesmo layout de
// colunas nos dois casos, para que o arquivo exportado sirva de modelo para
// reimportacao (edita no Excel e reenvia).

var bomExcelHeaders = []string{"Cod. Interno", "Material", "UN", "Quantidade", "Fornecedor/Fabricante"}

const bomExcelSheet = "BOM"

func buildBomWorkbook(items []bomItemDTO) (*excelize.File, error) {
	f := excelize.NewFile()
	if err := f.SetSheetName("Sheet1", bomExcelSheet); err != nil {
		return nil, err
	}
	headerStyle, err := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}})
	if err != nil {
		return nil, err
	}
	for col, header := range bomExcelHeaders {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		f.SetCellValue(bomExcelSheet, cell, header)
	}
	lastCol, _ := excelize.CoordinatesToCellName(len(bomExcelHeaders), 1)
	f.SetCellStyle(bomExcelSheet, "A1", lastCol, headerStyle)

	for i, item := range items {
		row := i + 2
		f.SetCellValue(bomExcelSheet, fmt.Sprintf("A%d", row), item.InternalCode)
		f.SetCellValue(bomExcelSheet, fmt.Sprintf("B%d", row), item.PartName)
		f.SetCellValue(bomExcelSheet, fmt.Sprintf("C%d", row), item.UnitOfMeasure)
		f.SetCellValue(bomExcelSheet, fmt.Sprintf("D%d", row), item.Quantity)
		f.SetCellValue(bomExcelSheet, fmt.Sprintf("E%d", row), item.Supplier)
	}
	f.SetColWidth(bomExcelSheet, "A", "A", 16)
	f.SetColWidth(bomExcelSheet, "B", "B", 42)
	f.SetColWidth(bomExcelSheet, "C", "C", 8)
	f.SetColWidth(bomExcelSheet, "D", "D", 14)
	f.SetColWidth(bomExcelSheet, "E", "E", 30)
	return f, nil
}

func writeXlsxResponse(c *gin.Context, f *excelize.File, filename string) {
	buf, err := f.WriteToBuffer()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

var filenameSanitizer = regexp.MustCompile(`[^a-zA-Z0-9_-]+`)

func slugifyFilename(name string) string {
	slug := filenameSanitizer.ReplaceAllString(strings.TrimSpace(name), "_")
	slug = strings.Trim(slug, "_")
	if slug == "" {
		return "bom"
	}
	return slug
}

// --- Export ---

func (h *ProductionHandler) ExportModelBom(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	model, err := h.modelRepo.FindByID(ctx, c.Param("modelId"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Modelo não encontrado"})
		return
	}

	var items []models.ProductionBomItem
	if err := h.bomRepo.Q(ctx).
		Where("production_model_id = ? AND variant = ?", model.ID, "standard").
		Order("created_at ASC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	f, err := buildBomWorkbook(h.enrichBomItems(ctx, items))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	writeXlsxResponse(c, f, fmt.Sprintf("bom_padrao_%s.xlsx", slugifyFilename(model.Name)))
}

func (h *ProductionHandler) ExportBuildBom(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	build, err := h.buildRepo.FindByID(ctx, c.Param("buildId"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Pedido não encontrado"})
		return
	}

	var items []models.ProductionBomItem
	if err := h.bomRepo.Q(ctx).
		Where("client_build_id = ? AND variant = ?", build.ID, "client").
		Order("created_at ASC").Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}

	f, err := buildBomWorkbook(h.enrichBomItems(ctx, items))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		return
	}
	writeXlsxResponse(c, f, fmt.Sprintf("bom_cliente_%s.xlsx", slugifyFilename(build.ClientName)))
}

// --- Import ---

type bomImportRow struct {
	RowNumber     int
	InternalCode  string
	PartName      string
	UnitOfMeasure string
	Quantity      float64
	Supplier      string
}

type bomImportResult struct {
	RowsRead     int `json:"rowsRead"`
	Created      int `json:"created"`
	Updated      int `json:"updated"`
	PartsCreated int `json:"partsCreated"`
}

func normalizeExcelHeader(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// readBomWorkbook lê o arquivo .xlsx enviado no campo "file" do multipart e
// devolve as linhas de material já validadas. As colunas são identificadas
// pelo cabeçalho (mesmo texto usado na exportação), não pela posição, então
// o usuário pode reordenar colunas na planilha sem quebrar o import.
func readBomWorkbook(c *gin.Context) ([]bomImportRow, error) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return nil, errors.New("nenhum arquivo enviado")
	}
	file, err := fileHeader.Open()
	if err != nil {
		return nil, errors.New("não foi possível abrir o arquivo")
	}
	defer file.Close()

	f, err := excelize.OpenReader(file)
	if err != nil {
		return nil, errors.New("arquivo inválido — envie uma planilha .xlsx")
	}
	defer f.Close()

	sheet := f.GetSheetName(0)
	if sheet == "" {
		return nil, errors.New("planilha sem abas")
	}
	allRows, err := f.GetRows(sheet)
	if err != nil {
		return nil, errors.New("não foi possível ler a planilha")
	}
	if len(allRows) == 0 {
		return nil, errors.New("planilha vazia")
	}

	colIdx := map[string]int{}
	for i, cell := range allRows[0] {
		colIdx[normalizeExcelHeader(cell)] = i
	}
	requiredCols := []string{"material", "quantidade"}
	for _, col := range requiredCols {
		if _, ok := colIdx[col]; !ok {
			return nil, fmt.Errorf("coluna %q não encontrada — use o arquivo exportado como modelo", col)
		}
	}

	get := func(row []string, key string) string {
		idx, ok := colIdx[key]
		if !ok || idx >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[idx])
	}

	var rows []bomImportRow
	for i, raw := range allRows[1:] {
		rowNumber := i + 2
		partName := get(raw, "material")
		if partName == "" {
			continue
		}
		qtyStr := strings.ReplaceAll(get(raw, "quantidade"), ",", ".")
		qty, err := strconv.ParseFloat(qtyStr, 64)
		if err != nil {
			return nil, fmt.Errorf("linha %d: quantidade inválida (%q)", rowNumber, get(raw, "quantidade"))
		}
		rows = append(rows, bomImportRow{
			RowNumber:     rowNumber,
			InternalCode:  get(raw, "cod. interno"),
			PartName:      partName,
			UnitOfMeasure: get(raw, "un"),
			Quantity:      qty,
			Supplier:      get(raw, "fornecedor/fabricante"),
		})
	}
	if len(rows) == 0 {
		return nil, errors.New("nenhuma linha de material encontrada na planilha")
	}
	return rows, nil
}

// findOrCreatePart casa a linha importada com uma peça existente por codigo
// interno e, na falta dele, pelo nome — para não duplicar o catalogo a cada
// reimportacao. Cria uma peça nova só quando nenhum dos dois casar.
func (h *ProductionHandler) findOrCreatePart(ctx context.Context, row bomImportRow) (string, bool, error) {
	if row.InternalCode != "" {
		if existing, err := h.partRepo.FindOne(ctx, "internal_code = ?", row.InternalCode); err == nil && existing != nil {
			return existing.ID, false, nil
		}
	}
	if existing, err := h.partRepo.FindOne(ctx, "name ILIKE ?", row.PartName); err == nil && existing != nil {
		return existing.ID, false, nil
	}

	unit := row.UnitOfMeasure
	if unit == "" {
		unit = "pç"
	}
	part := models.Part{
		Name:          row.PartName,
		UnitOfMeasure: unit,
		InternalCode:  row.InternalCode,
		Supplier:      row.Supplier,
	}
	if err := h.partRepo.Create(ctx, &part); err != nil {
		return "", false, err
	}
	return part.ID, true, nil
}

// importBomRows faz upsert: uma linha cuja peça já está no BOM (mesmo
// modelo/variante/pedido) atualiza a quantidade existente; caso contrário
// cria uma linha nova. Reimportar o mesmo arquivo é, portanto, idempotente.
func (h *ProductionHandler) importBomRows(ctx context.Context, modelID, variant string, buildID *string, rows []bomImportRow) (*bomImportResult, error) {
	result := &bomImportResult{RowsRead: len(rows)}

	for _, row := range rows {
		partID, created, err := h.findOrCreatePart(ctx, row)
		if err != nil {
			return nil, fmt.Errorf("linha %d: %w", row.RowNumber, err)
		}
		if created {
			result.PartsCreated++
		}

		query := h.bomRepo.Q(ctx).Where("production_model_id = ? AND variant = ? AND part_id = ?", modelID, variant, partID)
		if buildID != nil {
			query = query.Where("client_build_id = ?", *buildID)
		} else {
			query = query.Where("client_build_id IS NULL")
		}

		var existing models.ProductionBomItem
		err = query.First(&existing).Error
		switch {
		case err == nil:
			if err := h.bomRepo.MergeUpdate(ctx, existing.ID, map[string]interface{}{"quantity": row.Quantity}); err != nil {
				return nil, fmt.Errorf("linha %d: %w", row.RowNumber, err)
			}
			result.Updated++
		case errors.Is(err, gorm.ErrRecordNotFound):
			item := models.ProductionBomItem{
				ProductionModelID: modelID,
				Variant:           variant,
				ClientBuildID:     buildID,
				PartID:            partID,
				Quantity:          row.Quantity,
			}
			if err := h.bomRepo.Create(ctx, &item); err != nil {
				return nil, fmt.Errorf("linha %d: %w", row.RowNumber, err)
			}
			result.Created++
		default:
			return nil, fmt.Errorf("linha %d: %w", row.RowNumber, err)
		}
	}
	return result, nil
}

func (h *ProductionHandler) ImportModelBom(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	model, err := h.modelRepo.FindByID(ctx, c.Param("modelId"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Modelo não encontrado"})
		return
	}

	rows, err := readBomWorkbook(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	result, err := h.importBomRows(ctx, model.ID, "standard", nil, rows)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *ProductionHandler) ImportBuildBom(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	buildID := c.Param("buildId")
	build, err := h.buildRepo.FindByID(ctx, buildID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Pedido não encontrado"})
		return
	}

	rows, err := readBomWorkbook(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	result, err := h.importBomRows(ctx, build.ProductionModelID, "client", &build.ID, rows)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}
