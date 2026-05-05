package handlers

import (
	"context"
	"strings"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"
)

// SyncMachineStatusForMachine deixa o status da máquina coerente com processos em aberto.
// Ocorrência/pausa é do processo (e do operador), não "trava" a máquina para os demais.
// Há processo não finalizado nessa máquina → InProgress; caso contrário → Aguardando.
func SyncMachineStatusForMachine(
	ctx context.Context,
	processRepo *repositories.Repository[models.Process],
	machineRepo *repositories.Repository[models.Machine],
	machine *models.Machine,
) {
	if machine == nil {
		return
	}
	id := machine.ID
	idNum := strings.TrimSpace(machine.IdentificationNumber)
	var n int64
	q := processRepo.Q(ctx).Where("finished = ?", false)
	if idNum != "" {
		q = q.Where("machine_ref->>'id' = ? OR machine_ref->>'id' = ? OR machine_ref->>'name' = ?",
			id, idNum, idNum)
	} else {
		q = q.Where("machine_ref->>'id' = ?", id)
	}
	q.Count(&n)

	m, err := machineRepo.FindByID(ctx, id)
	if err != nil {
		return
	}
	m.Status = machineStatusForOpenProcessCount(n)
	_ = machineRepo.Save(ctx, m)
}

func machineStatusForOpenProcessCount(openCount int64) models.MachineStatus {
	if openCount > 0 {
		return models.InProgress
	}
	return models.WaitingProduction
}
