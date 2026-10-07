package handlers

import (
	"strings"
	"testing"
	"time"
)

func TestTrainingTimesUsesCampoGrandeOnTheTrainingDay(t *testing.T) {
	// Data gravada pelo front como meia-noite UTC (toIsoDate).
	date := time.Date(2026, 7, 20, 0, 0, 0, 0, time.UTC)

	start, end, err := trainingTimes(date, "14:30", "17:15")
	if err != nil {
		t.Fatal(err)
	}
	if got := start.UTC().Format(time.RFC3339); got != "2026-07-20T18:30:00Z" {
		t.Fatalf("start = %s", got)
	}
	if got := end.Sub(start).Hours(); got != 2.75 {
		t.Fatalf("duração = %v", got)
	}

	if _, _, err := trainingTimes(date, "17:00", "14:00"); err == nil {
		t.Fatal("esperava erro com fim antes do início")
	}
	if _, _, err := trainingTimes(date, "", "14:00"); err == nil {
		t.Fatal("esperava erro sem horário de início")
	}
}

func TestTrainingInviteSubjectStartsWithTreinamentoDateAndTime(t *testing.T) {
	start, end, _ := trainingTimes(time.Date(2026, 7, 20, 0, 0, 0, 0, time.UTC), "14:30", "17:15")

	got := trainingInviteSubject(start, end, "Estoque, compras e logística")
	want := "TREINAMENTO - 20/07/2026 14:30 às 17:15 - Estoque, compras e logística"
	if got != want {
		t.Fatalf("assunto = %q, esperado %q", got, want)
	}
	if got := trainingInviteSubject(start, end, " "); got != "TREINAMENTO - 20/07/2026 14:30 às 17:15" {
		t.Fatalf("assunto sem tema = %q", got)
	}
}

func TestParseInviteEmails(t *testing.T) {
	got, err := parseInviteEmails([]string{"Carlos@coldline.com.br; franke@coldline.com.br", "carlos@coldline.com.br\njessica@coldline.com.br"})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Join(got, ",") != "carlos@coldline.com.br,franke@coldline.com.br,jessica@coldline.com.br" {
		t.Fatalf("emails = %v", got)
	}
	if _, err := parseInviteEmails([]string{"nao-e-email"}); err == nil {
		t.Fatal("esperava erro com e-mail inválido")
	}
	if _, err := parseInviteEmails([]string{" , "}); err == nil {
		t.Fatal("esperava erro sem nenhum e-mail")
	}
}

func TestBuildTrainingICSIsAMeetingRequest(t *testing.T) {
	start, end, _ := trainingTimes(time.Date(2026, 7, 20, 0, 0, 0, 0, time.UTC), "14:30", "17:15")
	ics := buildTrainingICS("abc@portal.coldline.com.br", 2, "coldline@coldline.com.br",
		[]string{"carlos@coldline.com.br"}, start, end, "TREINAMENTO - 20/07/2026 14:30 às 17:15",
		"Módulos: Estoque; Compras, Logística\nDúvidas: transferência")

	for _, want := range []string{
		"METHOD:REQUEST",
		"UID:abc@portal.coldline.com.br",
		"SEQUENCE:2",
		"DTSTART:20260720T183000Z",
		"DTEND:20260720T211500Z",
		"ORGANIZER;CN=Coldline Brasil:mailto:coldline@coldline.com.br",
		"mailto:carlos@coldline.com.br",
		`Estoque\; Compras\, Logística\nDúvidas`,
	} {
		if !strings.Contains(strings.ReplaceAll(ics, "\r\n ", ""), want) {
			t.Fatalf("ics sem %q:\n%s", want, ics)
		}
	}
	for _, line := range strings.Split(ics, "\r\n") {
		if len(line) > 75 {
			t.Fatalf("linha com mais de 75 octetos: %q", line)
		}
	}
}
