package models

// Nomes fixos dos 5 processos de fabricação (process_types) e dos 2 motivos de
// pausa (occurrence_types) do módulo Indústria. Retrabalho NÃO é um processo —
// é o flag Process.ReWork, marcado junto com um dos 5 processos abaixo.
const (
	StageEletrica      = "Elétrica"
	StageSoldagem      = "Soldagem"
	StageMontagem      = "Montagem"
	StageCamaraDeTeste = "Câmara de Teste"
	StageAcabamento    = "Acabamento/Embalagem"

	PauseReasonFaltaDePeca = "Falta de Peça"
	PauseReasonEmergencia  = "Emergência"
)

// StageFinal é a última etapa de fabricação — sua conclusão (não-retrabalho)
// libera "Finalizar Máquina". Hoje é Acabamento/Embalagem (o teste na Câmara
// de Teste acontece antes, mas quem fecha o ciclo é embalar).
const StageFinal = StageAcabamento

// StageOrder lista os 5 processos na ordem de fabricação. StageFinal fica por
// último.
var StageOrder = []string{StageEletrica, StageSoldagem, StageMontagem, StageCamaraDeTeste, StageAcabamento}

// PauseReasonOrder lista os 2 motivos de pausa válidos.
var PauseReasonOrder = []string{PauseReasonFaltaDePeca, PauseReasonEmergencia}
