package scheduler

import (
	"context"
	"fmt"
	"log"
	"time"

	"coldline-api/internal/handlers"
	"coldline-api/internal/models"
	"coldline-api/internal/repositories"
	"coldline-api/internal/utils"

	"gorm.io/gorm"
)

// Start begins the shift scheduler goroutine. It fires at each shift boundary
// (07:30, 11:30, 13:00, 17:30 BRT) to auto-pause / auto-resume processes.
func Start(db *gorm.DB) {
	reconcileOnBoot(db)
	go run(db)
}

func run(db *gorm.DB) {
	for {
		next := utils.NextShiftEvent(time.Now())
		log.Printf("[scheduler] próximo evento: %s em %s", next.Name, next.At.Format(time.RFC3339))
		time.Sleep(time.Until(next.At))
		handle(db, next)
	}
}

func handle(db *gorm.DB, ev utils.ShiftEvent) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	var locked bool
	if err := db.WithContext(ctx).Raw("SELECT pg_try_advisory_lock(?)", int64(20260504)).Scan(&locked).Error; err != nil {
		log.Printf("[scheduler] erro ao adquirir lock distribuído: %v", err)
		return
	}
	if !locked {
		log.Printf("[scheduler] lock ocupado em outra instância; evento ignorado (%s)", ev.Name)
		return
	}
	defer db.WithContext(ctx).Exec("SELECT pg_advisory_unlock(?)", int64(20260504))

	procRepo := repositories.New[models.Process](db, "processes")
	occRepo := repositories.New[models.Occurrence](db, "occurrences")
	occTypeRepo := repositories.New[models.BaseEntity](db, "occurrence_types")
	userRepo := repositories.New[models.User](db, "users")
	machRepo := repositories.New[models.Machine](db, "machines")

	workingNow := utils.IsWorkingTime(time.Now())
	if ev.IsStart && !workingNow {
		log.Printf("[scheduler] ignorando auto-resume fora do horário (%s)", ev.Name)
		return
	}
	if !ev.IsStart && workingNow {
		log.Printf("[scheduler] ignorando auto-pause durante horário de trabalho (%s)", ev.Name)
		return
	}

	if ev.IsStart {
		autoResume(ctx, procRepo, occRepo, userRepo, machRepo)
	} else {
		sysType := ensureSystemOccurrenceType(ctx, occTypeRepo)
		autoPause(ctx, procRepo, occRepo, userRepo, machRepo, sysType)
	}
}

func shouldRunEvent(isStart, workingNow bool) bool {
	// Início de turno só pode rodar em horário de trabalho;
	// fim de turno só pode rodar fora de horário de trabalho.
	if isStart {
		return workingNow
	}
	return !workingNow
}

// reconcileOnBoot evita estado incorreto quando a API reinicia e perde um boundary.
func reconcileOnBoot(db *gorm.DB) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	procRepo := repositories.New[models.Process](db, "processes")
	occRepo := repositories.New[models.Occurrence](db, "occurrences")
	occTypeRepo := repositories.New[models.BaseEntity](db, "occurrence_types")
	userRepo := repositories.New[models.User](db, "users")
	machRepo := repositories.New[models.Machine](db, "machines")

	if utils.IsWorkingTime(time.Now()) {
		autoResume(ctx, procRepo, occRepo, userRepo, machRepo)
		return
	}
	sysType := ensureSystemOccurrenceType(ctx, occTypeRepo)
	autoPause(ctx, procRepo, occRepo, userRepo, machRepo, sysType)
}

// ensureSystemOccurrenceType returns (or creates) the system occurrence type.
func ensureSystemOccurrenceType(ctx context.Context, repo *repositories.Repository[models.BaseEntity]) *models.BaseEntity {
	existing, err := repo.FindOne(ctx, "name = ?", models.SystemOccurrenceTypeName)
	if err == nil && existing != nil {
		return existing
	}
	t := &models.BaseEntity{Name: models.SystemOccurrenceTypeName, Description: "Criado automaticamente pelo sistema"}
	if err := repo.Create(ctx, t); err != nil {
		log.Printf("[scheduler] erro ao criar tipo de ocorrência sistema: %v", err)
		return nil
	}
	return t
}

// autoPause pauses all active (non-finished, non-paused) processes.
func autoPause(
	ctx context.Context,
	procRepo *repositories.Repository[models.Process],
	occRepo *repositories.Repository[models.Occurrence],
	userRepo *repositories.Repository[models.User],
	machRepo *repositories.Repository[models.Machine],
	sysType *models.BaseEntity,
) {
	if utils.IsWorkingTime(time.Now()) {
		log.Printf("[scheduler] autoPause ignorado: horário de trabalho ativo")
		return
	}
	var procs []models.Process
	procRepo.Q(ctx).Where("finished = ? AND in_occurrence = ?", false, false).Find(&procs)

	now := time.Now().UTC()
	for i := range procs {
		p := &procs[i]
		occ := &models.Occurrence{
			CodeOccurrence: fmt.Sprintf("SYS%06d", now.UnixMilli()%1000000),
			StartDate:      now,
			Finished:       false,
			Description:    models.SystemAutoPauseDescription,
			Process:        &models.ReferenceEntity{ID: p.ID, Name: p.IdentificationNumber},
			User:           p.User,
			Department:     p.Department,
			Machine:        p.Machine,
		}
		if sysType != nil {
			occ.OccurrenceType = &models.ReferenceEntity{ID: sysType.ID, Name: sysType.Name}
		}
		if err := occRepo.Create(ctx, occ); err != nil {
			log.Printf("[scheduler] erro ao criar ocorrência automática p=%s: %v", p.ID, err)
			continue
		}

		p.InOccurrence = true
		p.OccurrenceStartDate = &now
		p.Occurrences = append(p.Occurrences, models.ReferenceEntity{ID: occ.ID, Name: occ.CodeOccurrence})
		procRepo.Save(ctx, p)
		if p.Machine != nil && p.Machine.ID != "" {
			if m, err := machRepo.FindByID(ctx, p.Machine.ID); err == nil {
				handlers.SyncMachineStatusForMachine(ctx, procRepo, machRepo, m)
			}
		}

		if p.User != nil && p.User.ID != "" {
			if u, err := userRepo.FindByID(ctx, p.User.ID); err == nil {
				u.CurrentOccurrence = &models.ReferenceEntity{ID: occ.ID, Name: occ.CodeOccurrence}
				userRepo.Save(ctx, u)
			}
		}
	}
	log.Printf("[scheduler] auto-pausou %d processos", len(procs))
}

// autoResume resumes all system occurrences (outside-shift pauses).
func autoResume(
	ctx context.Context,
	procRepo *repositories.Repository[models.Process],
	occRepo *repositories.Repository[models.Occurrence],
	userRepo *repositories.Repository[models.User],
	machRepo *repositories.Repository[models.Machine],
) {
	if !utils.IsWorkingTime(time.Now()) {
		log.Printf("[scheduler] autoResume ignorado: fora do horário de trabalho")
		return
	}
	var occs []models.Occurrence
	occRepo.Q(ctx).
		Where("finished = ? AND description = ?", false, models.SystemAutoPauseDescription).
		Find(&occs)

	now := time.Now().UTC()
	for i := range occs {
		o := &occs[i]
		duration := now.Sub(o.StartDate)
		// System occurrences are outside shift — working seconds = 0.
		// We still finalize them cleanly.
		o.Finished = true
		o.EndDate = &now
		o.ProcessTime = utils.FormatSeconds(int(duration.Seconds()))
		occRepo.Save(ctx, o)

		if o.Process != nil && o.Process.ID != "" {
			if proc, err := procRepo.FindByID(ctx, o.Process.ID); err == nil {
				proc.InOccurrence = false
				proc.OccurrenceStartDate = nil
				// totalOccurrenceSeconds does NOT increase — it was non-working time
				procRepo.Save(ctx, proc)

				if proc.Machine != nil && proc.Machine.ID != "" {
					if m, err := machRepo.FindByID(ctx, proc.Machine.ID); err == nil {
						handlers.SyncMachineStatusForMachine(ctx, procRepo, machRepo, m)
					}
				}
			}
		}
		if o.User != nil && o.User.ID != "" {
			if u, err := userRepo.FindByID(ctx, o.User.ID); err == nil {
				u.CurrentOccurrence = nil
				userRepo.Save(ctx, u)
			}
		}
	}
	log.Printf("[scheduler] auto-retomou %d processos", len(occs))
}
