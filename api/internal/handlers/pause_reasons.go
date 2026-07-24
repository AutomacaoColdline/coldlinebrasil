package handlers

import (
	"context"
	"fmt"
	"strings"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"
)

// PartRef é o payload aceito pro campo "parts" ao pausar por Falta de Peça:
// id de uma peça já cadastrada, ou name pra criar uma nova na hora.
type PartRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func resolvePartRef(ctx context.Context, partRepo *repositories.Repository[models.BaseEntity], ref PartRef) (models.ReferenceEntity, error) {
	id := strings.TrimSpace(ref.ID)
	name := strings.TrimSpace(ref.Name)
	if id != "" {
		if p, err := partRepo.FindByID(ctx, id); err == nil && p != nil {
			return models.ReferenceEntity{ID: p.ID, Name: p.Name}, nil
		}
	}
	if name == "" {
		return models.ReferenceEntity{}, fmt.Errorf("peça inválida")
	}
	if p, err := partRepo.FindOne(ctx, "name ILIKE ?", name); err == nil && p != nil {
		return models.ReferenceEntity{ID: p.ID, Name: p.Name}, nil
	}
	p := &models.BaseEntity{Name: name}
	if err := partRepo.Create(ctx, p); err != nil {
		return models.ReferenceEntity{}, err
	}
	return models.ReferenceEntity{ID: p.ID, Name: p.Name}, nil
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
	partRepo *repositories.Repository[models.BaseEntity],
	typeName, description string,
	rawParts []PartRef,
) ([]models.ReferenceEntity, error) {
	switch {
	case isFaltaDePecaOccurrenceTypeName(typeName):
		if len(rawParts) == 0 {
			return nil, fmt.Errorf("bad_request: selecione ao menos uma peça em falta")
		}
		resolved := make([]models.ReferenceEntity, 0, len(rawParts))
		seen := map[string]struct{}{}
		for _, raw := range rawParts {
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
