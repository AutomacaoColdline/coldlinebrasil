package handlers

import (
	"context"
	"fmt"
	"html"
	"log"
	"strings"

	"coldline-api/internal/email"
	"coldline-api/internal/models"
	"coldline-api/internal/repositories"
	"coldline-api/internal/utils"

	"gorm.io/gorm"
)

// sendPartsRequisitionEmail dispara um único email, para todos os endereços
// cadastrados em "requisition_emails", com a lista de peças/quantidades de
// uma ocorrência "Falta de Peça". Best-effort: nunca bloqueia quem chamou —
// se não houver destinatários cadastrados ou o SMTP falhar, só loga e
// retorna false, pra quem chamou decidir se avisa o usuário.
func sendPartsRequisitionEmail(ctx context.Context, db *gorm.DB, cfg email.Config, occ *models.Occurrence) bool {
	emailRepo := repositories.New[models.BaseEntity](db, "requisition_emails")
	recipients, err := emailRepo.FindAll(ctx)
	if err != nil {
		log.Printf("❌ Requisição de peças: erro ao buscar emails cadastrados: %v", err)
		return false
	}
	if len(recipients) == 0 {
		log.Printf("⚠️ Requisição de peças: nenhum email cadastrado em Configurações > Emails de Requisição, nada enviado")
		return true
	}

	to := make([]string, 0, len(recipients))
	for _, r := range recipients {
		if addr := strings.TrimSpace(r.Name); addr != "" {
			to = append(to, addr)
		}
	}
	if len(to) == 0 {
		return true
	}

	machineName := "—"
	if occ.Machine != nil && strings.TrimSpace(occ.Machine.Name) != "" {
		machineName = occ.Machine.Name
	}
	processName := "—"
	if occ.Process != nil && strings.TrimSpace(occ.Process.Name) != "" {
		processName = occ.Process.Name
	}
	userName := "—"
	if occ.User != nil && strings.TrimSpace(occ.User.Name) != "" {
		userName = occ.User.Name
	}

	rows := ""
	for _, p := range occ.Parts {
		qty := fmt.Sprintf("%g", p.Quantity)
		unit := p.UnitOfMeasure
		if unit == "" {
			unit = "—"
		}
		rows += fmt.Sprintf(
			"<tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0\">%s</td><td style=\"padding:6px 10px;border:1px solid #e2e8f0;text-align:center\">%s</td><td style=\"padding:6px 10px;border:1px solid #e2e8f0;text-align:center\">%s</td></tr>",
			html.EscapeString(p.Name), html.EscapeString(qty), html.EscapeString(unit),
		)
	}

	descriptionBlock := ""
	if strings.TrimSpace(occ.Description) != "" {
		descriptionBlock = fmt.Sprintf("<p><strong>Observações:</strong> %s</p>", html.EscapeString(occ.Description))
	}

	body := fmt.Sprintf(`
		<div style="font-family:Arial,Helvetica,sans-serif;color:#1e293b">
			<h2 style="margin-bottom:4px">Requisição de Peças</h2>
			<p style="color:#64748b;margin-top:0">Gerada automaticamente pela pausa "Falta de Peça" no sistema Coldline Indústria.</p>
			<p><strong>Processo:</strong> %s &nbsp;|&nbsp; <strong>Máquina:</strong> %s</p>
			<p><strong>Solicitante:</strong> %s &nbsp;|&nbsp; <strong>Data/Hora:</strong> %s</p>
			%s
			<table style="border-collapse:collapse;margin-top:10px">
				<thead>
					<tr style="background:#f1f5f9">
						<th style="padding:6px 10px;border:1px solid #e2e8f0;text-align:left">Peça</th>
						<th style="padding:6px 10px;border:1px solid #e2e8f0">Quantidade</th>
						<th style="padding:6px 10px;border:1px solid #e2e8f0">Unidade</th>
					</tr>
				</thead>
				<tbody>%s</tbody>
			</table>
		</div>`,
		html.EscapeString(processName), html.EscapeString(machineName),
		html.EscapeString(userName), occ.StartDate.In(utils.Location()).Format("02/01/2006 15:04"),
		descriptionBlock, rows,
	)

	subject := fmt.Sprintf("Requisição de Peças – Processo #%s", processName)
	if err := email.Send(cfg, to, subject, body); err != nil {
		log.Printf("❌ Requisição de peças: erro ao enviar email: %v", err)
		return false
	}
	return true
}
