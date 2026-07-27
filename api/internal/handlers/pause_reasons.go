package handlers

import (
	"context"
	"fmt"
	"strings"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"
)

// PartRef é o payload aceito pro campo "parts" ao pausar por Falta de Peça:
// id de uma peça já cadastrada, ou name pra criar uma nova na hora, mais a
// quantidade requisitada dessa peça.
type PartRef struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Quantity float64 `json:"quantity"`
}

func resolvePartRef(ctx context.Context, partRepo *repositories.Repository[models.Part], ref PartRef) (models.RequisitionPart, error) {
	id := strings.TrimSpace(ref.ID)
	name := strings.TrimSpace(ref.Name)
	if id != "" {
		if p, err := partRepo.FindByID(ctx, id); err == nil && p != nil {
			return models.RequisitionPart{ID: p.ID, Name: p.Name, Quantity: ref.Quantity, UnitOfMeasure: p.UnitOfMeasure}, nil
		}
	}
	if name == "" {
		return models.RequisitionPart{}, fmt.Errorf("peça inválida")
	}
	if p, err := partRepo.FindOne(ctx, "name ILIKE ?", name); err == nil && p != nil {
		return models.RequisitionPart{ID: p.ID, Name: p.Name, Quantity: ref.Quantity, UnitOfMeasure: p.UnitOfMeasure}, nil
	}
	p := &models.Part{Name: name, UnitOfMeasure: "pç"}
	if err := partRepo.Create(ctx, p); err != nil {
		return models.RequisitionPart{}, err
	}
	return models.RequisitionPart{ID: p.ID, Name: p.Name, Quantity: ref.Quantity, UnitOfMeasure: p.UnitOfMeasure}, nil
}

func isFaltaDePecaOccurrenceTypeName(name string) bool {
	return strings.EqualFold(strings.TrimSpace(name), models.PauseReasonFaltaDePeca)
}

func isEmergenciaOccurrenceTypeName(name string) bool {
	return strings.EqualFold(strings.TrimSpace(name), models.PauseReasonEmergencia)
}

// validatePauseReason garante que "Falta de Peça" tenha 1+ peças selecionadas e
// que "Emergência" tenha descrição obrigatória (demais tipos legados seguem a
// regra antiga de "Outro"). Retorna as peças resolvidas (existentes ou recém-
// criadas), prontas pra gravar em Occurrence.Parts.
func validatePauseReason(
	ctx context.Context,
	partRepo *repositories.Repository[models.Part],
	typeName, description string,
	rawParts []PartRef,
) ([]models.RequisitionPart, error) {
	switch {
	case isFaltaDePecaOccurrenceTypeName(typeName):
		if len(rawParts) == 0 {
			return nil, fmt.Errorf("bad_request: selecione ao menos uma peça em falta")
		}
		resolved := make([]models.RequisitionPart, 0, len(rawParts))
		seen := map[string]struct{}{}
		for _, raw := range rawParts {
			if raw.Quantity <= 0 {
				return nil, fmt.Errorf("bad_request: informe a quantidade de todas as peças em falta")
			}
			ref, err := resolvePartRef(ctx, partRepo, raw)
			if err != nil {
				return nil, fmt.Errorf("bad_request: %s", err.Error())
			}
			if _, dup := seen[ref.ID]; dup {
				continue
			}
			seen[ref.ID] = struct{}{}
			resolved = append(resolved, ref)
		}
		return resolved, nil
	case isEmergenciaOccurrenceTypeName(typeName):
		if strings.TrimSpace(description) == "" {
			return nil, fmt.Errorf("bad_request: informe a descrição da emergência")
		}
		return nil, nil
	default:
		if isOutroOccurrenceTypeName(typeName) && strings.TrimSpace(description) == "" {
			return nil, fmt.Errorf(`bad_request: informe o motivo quando o tipo de ocorrência for "Outro"`)
		}
		return nil, nil
	}
}
