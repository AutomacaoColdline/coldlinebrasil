package handlers

import (
	"context"
	"strings"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"

	"gorm.io/gorm"
)

func uniqueMachineCandidates(values ...string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))

	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}

	return result
}

func machineReferenceCandidates(machine *models.Machine, fallbackValues ...string) []string {
	if machine == nil {
		return uniqueMachineCandidates(fallbackValues...)
	}

	values := []string{
		machine.ID,
		machine.IdentificationNumber,
		machine.CustomerName,
	}
	values = append(values, fallbackValues...)
	return uniqueMachineCandidates(values...)
}

func resolveMachineReferenceCandidates(
	ctx context.Context,
	machineRepo *repositories.Repository[models.Machine],
	rawValue string,
) []string {
	rawValue = strings.TrimSpace(rawValue)
	if rawValue == "" {
		return nil
	}

	candidates := uniqueMachineCandidates(rawValue)
	if machineRepo == nil {
		return candidates
	}

	if machine, err := machineRepo.FindByID(ctx, rawValue); err == nil && machine != nil {
		return machineReferenceCandidates(machine, rawValue)
	}
	if machine, _ := machineRepo.FindOne(ctx, "identification_number = ?", rawValue); machine != nil {
		return machineReferenceCandidates(machine, rawValue)
	}
	if machine, _ := machineRepo.FindOne(ctx, "customer_name = ?", rawValue); machine != nil {
		return machineReferenceCandidates(machine, rawValue)
	}

	return candidates
}

func applyMachineReferenceFilter(db *gorm.DB, candidates []string) *gorm.DB {
	candidates = uniqueMachineCandidates(candidates...)
	if len(candidates) == 0 {
		return db
	}

	clauses := make([]string, 0, len(candidates))
	args := make([]interface{}, 0, len(candidates)*2)
	for _, candidate := range candidates {
		clauses = append(clauses, "(machine_ref->>'id' = ? OR machine_ref->>'name' = ?)")
		args = append(args, candidate, candidate)
	}

	return db.Where(strings.Join(clauses, " OR "), args...)
}
