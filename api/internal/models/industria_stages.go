package models

// Nomes fixos dos 5 processos de fabricação (process_types) e dos 2 motivos de
// pausa (occurrence_types) do módulo Indústria. Retrabalho NÃO é um processo —
// é o flag Process.ReWork, marcado junto com um dos 5 processos abaixo.
const (
	StageEletrica      = "Elétrica"
	StageSoldagem      = "Soldagem"
	StageMontagem      = "Montagem"
	StageAcabamento    = "Acabamento"
	StageCamaraDeTeste = "Câmara de Teste"

	PauseReasonFaltaDePeca = "Falta de Peça"
	PauseReasonEmergencia  = "Emergência"
)

// StageOrder lista os 5 processos na ordem de fabricação. Câmara de Teste é o
// último — sua conclusão (não-retrabalho) libera "Finalizar Máquina".
var StageOrder = []string{StageEletrica, StageSoldagem, StageMontagem, StageAcabamento, StageCamaraDeTeste}

// legacyProcessTypeNames e legacyOccurrenceTypeNames são os nomes de seed
// antigos (genéricos de manutenção), substituídos pelos processos/motivos
// reais de fabricação. Mantidos aqui só para a migração one-shot em seed.go.
var LegacyProcessTypeNames = []string{
	"Manutenção Preventiva", "Manutenção Corretiva", "Instalação", "Inspeção", "Calibração",
}

var LegacyOccurrenceTypeNames = []string{
	"Falha Elétrica", "Falha Mecânica", "Falha de Software", "Acidente", "Parada Não Planejada",
}
