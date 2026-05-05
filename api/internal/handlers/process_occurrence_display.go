package handlers

import (
	"context"
	"time"

	"coldline-api/internal/models"
	"coldline-api/internal/repositories"
	"coldline-api/internal/utils"

	"gorm.io/gorm"
)

func isSystemAutoPauseOccurrence(o *models.Occurrence) bool {
	if o == nil {
		return false
	}
	if o.Description == models.SystemAutoPauseDescription {
		return true
	}
	if o.OccurrenceType != nil && o.OccurrenceType.Name == models.SystemOccurrenceTypeName {
		return true
	}
	return false
}

// RepairStuckProcessOccurrenceState corrige inconsistências comuns:
// (1) expediente já voltou mas ocorrências "sistema" seguem abertas;
// (2) processo marcado in_occurrence sem ocorrência aberta vinculada.
func RepairStuckProcessOccurrenceState(ctx context.Context, db *gorm.DB) error {
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		procRepo := repositories.New[models.Process](tx, "processes")
		occRepo := repositories.New[models.Occurrence](tx, "occurrences")
		userRepo := repositories.New[models.User](tx, "users")
		machRepo := repositories.New[models.Machine](tx, "machines")
		now := time.Now().UTC()

		// (1) Durante horário útil, não deveria existir pausa automática "sistema" aberta.
		if utils.IsWorkingTime(now) {
			var stuck []models.Occurrence
			if err := occRepo.Q(ctx).
				Where("finished = ? AND description = ?", false, models.SystemAutoPauseDescription).
				Find(&stuck).Error; err != nil {
				return err
			}
			for i := range stuck {
				o := &stuck[i]
				duration := now.Sub(o.StartDate)
				o.Finished = true
				o.EndDate = &now
				o.ProcessTime = utils.FormatSeconds(int(duration.Seconds()))
				if err := occRepo.Save(ctx, o); err != nil {
					return err
				}
				if o.Process != nil && o.Process.ID != "" {
					if proc, err := procRepo.FindByID(ctx, o.Process.ID); err == nil {
						proc.InOccurrence = false
						proc.OccurrenceStartDate = nil
						if err := procRepo.Save(ctx, proc); err != nil {
							return err
						}
						if proc.Machine != nil && proc.Machine.ID != "" {
							if m, err := machRepo.FindByID(ctx, proc.Machine.ID); err == nil {
								SyncMachineStatusForMachine(ctx, procRepo, machRepo, m)
							}
						}
					}
				}
				if o.User != nil && o.User.ID != "" {
					if u, err := userRepo.FindByID(ctx, o.User.ID); err == nil {
						u.CurrentOccurrence = nil
						_ = userRepo.Save(ctx, u)
					}
				}
			}
		}

		// (2) Processo in_occurrence sem nenhuma ocorrência aberta para esse processo.
		var orphans []models.Process
		if err := procRepo.Q(ctx).
			Where("finished = ? AND in_occurrence = ?", false, true).
			Find(&orphans).Error; err != nil {
			return err
		}
		for i := range orphans {
			p := &orphans[i]
			var n int64
			occRepo.Q(ctx).
				Where("process_ref->>'id' = ? AND finished = ?", p.ID, false).
				Count(&n)
			if n > 0 {
				continue
			}
			p.InOccurrence = false
			p.OccurrenceStartDate = nil
			if err := procRepo.Save(ctx, p); err != nil {
				return err
			}
			if p.Machine != nil && p.Machine.ID != "" {
				if m, err := machRepo.FindByID(ctx, p.Machine.ID); err == nil {
					SyncMachineStatusForMachine(ctx, procRepo, machRepo, m)
				}
			}
			if p.User != nil && p.User.ID != "" {
				if u, err := userRepo.FindByID(ctx, p.User.ID); err == nil &&
					u.CurrentProcess != nil && u.CurrentProcess.ID == p.ID {
					u.CurrentOccurrence = nil
					_ = userRepo.Save(ctx, u)
				}
			}
		}
		return nil
	})
}

// EnrichProcessesOperatorOccurrence preenche InOperatorOccurrence (gorm:"-") para a UI:
// true apenas quando há ocorrência aberta que não é a pausa automática do sistema.
func EnrichProcessesOperatorOccurrence(ctx context.Context, db *gorm.DB, processes []models.Process) {
	if len(processes) == 0 {
		return
	}
	var open []models.Occurrence
	if err := db.WithContext(ctx).Where("finished = ?", false).Find(&open).Error; err != nil {
		return
	}
	byProc := make(map[string][]models.Occurrence)
	for i := range open {
		o := &open[i]
		if o.Process == nil || o.Process.ID == "" {
			continue
		}
		pid := o.Process.ID
		byProc[pid] = append(byProc[pid], *o)
	}
	for i := range processes {
		p := &processes[i]
		if !p.InOccurrence {
			p.InOperatorOccurrence = false
			continue
		}
		list := byProc[p.ID]
		op := false
		for j := range list {
			if !isSystemAutoPauseOccurrence(&list[j]) {
				op = true
				break
			}
		}
		p.InOperatorOccurrence = op
	}
}
