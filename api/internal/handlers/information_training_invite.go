package handlers

import (
	"context"
	"fmt"
	"html"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"coldline-api/internal/email"
)

// Horário de Campo Grande/MS (UTC-4, sem horário de verão desde 2019). Fuso
// fixo em vez de LoadLocation pra não depender do tzdata da imagem.
var trainingZone = time.FixedZone("America/Campo_Grande", -4*60*60)

// trainingTimes junta a data do treinamento (gravada como meia-noite UTC, ver
// toIsoDate no front) com os horários "HH:MM" de início/fim.
func trainingTimes(date time.Time, startTime, endTime string) (time.Time, time.Time, error) {
	day := date.UTC()
	parse := func(value string) (time.Time, error) {
		clock, err := time.Parse("15:04", strings.TrimSpace(value))
		if err != nil {
			return time.Time{}, fmt.Errorf("horário inválido: %q (use HH:MM)", value)
		}
		return time.Date(day.Year(), day.Month(), day.Day(), clock.Hour(), clock.Minute(), 0, 0, trainingZone), nil
	}
	start, err := parse(startTime)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	end, err := parse(endTime)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	if !end.After(start) {
		return time.Time{}, time.Time{}, fmt.Errorf("o horário final precisa ser depois do inicial")
	}
	return start, end, nil
}

// trainingHoursFromTimes devolve a duração em horas quando os dois horários
// são válidos (usado pra preencher "Horas" sozinho no cadastro).
func trainingHoursFromTimes(date time.Time, startTime, endTime string) (float64, bool) {
	if strings.TrimSpace(startTime) == "" || strings.TrimSpace(endTime) == "" {
		return 0, false
	}
	start, end, err := trainingTimes(date, startTime, endTime)
	if err != nil {
		return 0, false
	}
	return end.Sub(start).Hours(), true
}

// trainingInviteSubject: "TREINAMENTO - 20/07/2026 14:30 às 17:15 - Tema".
func trainingInviteSubject(start, end time.Time, theme string) string {
	subject := fmt.Sprintf("TREINAMENTO - %s %s às %s", start.Format("02/01/2006"), start.Format("15:04"), end.Format("15:04"))
	if theme = strings.TrimSpace(theme); theme != "" {
		subject += " - " + theme
	}
	return subject
}

func icsEscape(value string) string {
	replacer := strings.NewReplacer(`\`, `\\`, ";", `\;`, ",", `\,`, "\r\n", `\n`, "\n", `\n`)
	return replacer.Replace(value)
}

// icsFold quebra linhas do .ics em 75 octetos (RFC 5545 3.1), sem cortar
// caracteres UTF-8 no meio.
func icsFold(line string) string {
	var b strings.Builder
	count := 0
	for _, r := range line {
		size := len(string(r))
		if count+size > 75 {
			b.WriteString("\r\n ")
			count = 1
		}
		b.WriteRune(r)
		count += size
	}
	return b.String()
}

func buildTrainingICS(uid string, sequence int, organizer string, attendees []string, start, end time.Time, summary, description string) string {
	const stamp = "20060102T150405Z"
	lines := []string{
		"BEGIN:VCALENDAR",
		"PRODID:-//Coldline Brasil//Departamento de Informacao//PT-BR",
		"VERSION:2.0",
		"CALSCALE:GREGORIAN",
		"METHOD:REQUEST",
		"BEGIN:VEVENT",
		"UID:" + uid,
		fmt.Sprintf("SEQUENCE:%d", sequence),
		"DTSTAMP:" + time.Now().UTC().Format(stamp),
		"DTSTART:" + start.UTC().Format(stamp),
		"DTEND:" + end.UTC().Format(stamp),
		"SUMMARY:" + icsEscape(summary),
		"DESCRIPTION:" + icsEscape(description),
		"ORGANIZER;CN=Coldline Brasil:mailto:" + organizer,
	}
	for _, attendee := range attendees {
		lines = append(lines, "ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:"+attendee)
	}
	lines = append(lines,
		"STATUS:CONFIRMED",
		"TRANSP:OPAQUE",
		"BEGIN:VALARM",
		"TRIGGER:-PT30M",
		"ACTION:DISPLAY",
		"DESCRIPTION:"+icsEscape(summary),
		"END:VALARM",
		"END:VEVENT",
		"END:VCALENDAR",
	)
	for i, line := range lines {
		lines[i] = icsFold(line)
	}
	return strings.Join(lines, "\r\n") + "\r\n"
}

// parseInviteEmails aceita lista separada por vírgula, ponto e vírgula ou
// quebra de linha; remove duplicados e valida cada endereço.
func parseInviteEmails(values []string) ([]string, error) {
	seen := map[string]bool{}
	var result []string
	for _, value := range values {
		for _, part := range strings.FieldsFunc(value, func(r rune) bool { return r == ',' || r == ';' || r == '\n' || r == '\r' }) {
			address := strings.ToLower(strings.TrimSpace(part))
			if address == "" || seen[address] {
				continue
			}
			parsed, err := mail.ParseAddress(address)
			if err != nil || parsed.Address != address {
				return nil, fmt.Errorf("e-mail inválido: %s", address)
			}
			seen[address] = true
			result = append(result, address)
		}
	}
	if len(result) == 0 {
		return nil, fmt.Errorf("informe pelo menos um e-mail")
	}
	return result, nil
}

func trainingInviteHTML(start, end time.Time, theme, department, modules, questions, participants string) string {
	row := func(label, value string) string {
		value = strings.TrimSpace(value)
		if value == "" {
			return ""
		}
		return fmt.Sprintf(
			`<tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;vertical-align:top;width:180px">%s</td><td style="padding:8px 12px;border:1px solid #e2e8f0;white-space:pre-line">%s</td></tr>`,
			label, html.EscapeString(value),
		)
	}
	return fmt.Sprintf(`<div style="font-family:Arial,sans-serif;color:#1e293b;max-width:640px">
<h2 style="margin:0 0 4px">Convite de Treinamento</h2>
<p style="margin:0 0 16px;color:#475569">Você foi convidado(a) para o treinamento abaixo. Confirme sua presença pelo convite da agenda.</p>
<table style="border-collapse:collapse;width:100%%;font-size:14px">%s%s%s%s%s%s</table>
<p style="margin-top:16px;font-size:12px;color:#94a3b8">Departamento de Informação - Coldline Brasil</p>
</div>`,
		row("Data", start.Format("02/01/2006")),
		row("Horário", fmt.Sprintf("Das %s às %s", start.Format("15:04"), end.Format("15:04"))),
		row("Tema", theme),
		row("Departamento", department),
		row("Módulos", modules),
		row("Dúvidas repassadas", questions)+row("Participantes", participants),
	)
}

// SendTrainingInvite envia o treinamento como convite de agenda (reunião)
// pros e-mails escolhidos. Reenviar o mesmo treinamento reaproveita o UID e
// aumenta o SEQUENCE, então a agenda de quem já recebeu é atualizada em vez
// de ganhar um evento duplicado.
func (h *InformationHandler) SendTrainingInvite(c *gin.Context) {
	var body struct {
		Emails []string `json:"emails"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}
	recipients, err := parseInviteEmails(body.Emails)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	training, err := h.trainingRepo.FindByID(ctx, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Treinamento nao encontrado"})
		return
	}

	start, end, err := trainingTimes(training.Date, training.StartTime, training.EndTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Preencha o horário de início e fim do treinamento: " + err.Error()})
		return
	}

	organizer := h.trainingInviteFrom
	if organizer == "" {
		organizer = h.emailCfg.From
	}
	sequence := training.InviteSequence
	if training.InviteSentAt != nil {
		sequence++
	}

	subject := trainingInviteSubject(start, end, training.Theme)
	description := strings.TrimSpace(strings.Join([]string{
		"Tema: " + training.Theme,
		"Módulos: " + training.ModulesCovered,
		"Dúvidas repassadas: " + training.QuestionsCovered,
		"Participantes: " + training.ParticipantNames,
	}, "\n"))
	ics := buildTrainingICS(training.ID+"@portal.coldline.com.br", sequence, organizer, recipients, start, end, subject, description)
	htmlBody := trainingInviteHTML(start, end, training.Theme, training.Department, training.ModulesCovered, training.QuestionsCovered, training.ParticipantNames)

	if err := email.SendCalendarInvite(h.emailCfg, organizer, recipients, subject, htmlBody, ics); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": "Não foi possível enviar o convite: " + err.Error()})
		return
	}

	now := time.Now().UTC()
	if err := h.trainingRepo.MergeUpdate(ctx, training.ID, map[string]interface{}{
		"inviteEmails":   strings.Join(recipients, ", "),
		"inviteSentAt":   now,
		"inviteSequence": sequence,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Convite enviado, mas não foi possível registrar o envio: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Convite enviado", "subject": subject, "recipients": recipients, "inviteSentAt": now})
}
