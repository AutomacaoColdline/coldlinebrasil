package handlers

import (
	"testing"

	"coldline-api/internal/models"
)

func TestMachineStatusForOpenProcessCount(t *testing.T) {
	if got := machineStatusForOpenProcessCount(0); got != models.WaitingProduction {
		t.Fatalf("esperava WaitingProduction para 0 processos abertos, recebeu %v", got)
	}
	if got := machineStatusForOpenProcessCount(2); got != models.InProgress {
		t.Fatalf("esperava InProgress para >0 processos abertos, recebeu %v", got)
	}
}
