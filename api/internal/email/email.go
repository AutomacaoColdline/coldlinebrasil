// Package email envia emails transacionais (recuperação de senha) via SMTP,
// pensado para uso com Google Workspace (smtp.gmail.com:587 + senha de app).
package email

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"mime"
	"net/smtp"
	"strings"
)

type Config struct {
	Host string
	Port string
	User string
	Pass string
	From string
}

func (c Config) configured() bool {
	return c.Host != "" && c.User != "" && c.Pass != "" && c.From != ""
}

// Send manda um único email HTML para uma lista de destinatários (todos
// visíveis no cabeçalho "To", todos recebendo a mesma mensagem — não é um
// email por pessoa). net/smtp.SendMail faz upgrade automático para STARTTLS
// quando o servidor anuncia suporte (caso do Gmail/Workspace na porta 587),
// então não é preciso lidar com TLS manualmente aqui.
func Send(cfg Config, to []string, subject, htmlBody string) error {
	if !cfg.configured() {
		return errors.New("smtp não configurado (defina SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM)")
	}
	if len(to) == 0 {
		return errors.New("nenhum destinatário informado")
	}

	addr := fmt.Sprintf("%s:%s", cfg.Host, cfg.Port)
	auth := smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)

	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=\"UTF-8\"\r\n\r\n%s\r\n",
		cfg.From, strings.Join(to, ", "), subject, htmlBody,
	)

	return smtp.SendMail(addr, auth, cfg.User, to, []byte(msg))
}

// SendCalendarInvite manda um convite de agenda (como um convite de reunião):
// corpo HTML + parte text/calendar com METHOD:REQUEST, que Gmail/Outlook
// reconhecem e mostram com os botões Sim/Talvez/Não e "adicionar à agenda".
// O .ics também vai como anexo, pra clientes que ignoram a parte inline.
// from sobrescreve cfg.From quando preenchido (o SMTP_USER precisa poder
// enviar como esse endereço - no Google Workspace, alias em "Enviar como").
func SendCalendarInvite(cfg Config, from string, to []string, subject, htmlBody, ics string) error {
	if !cfg.configured() {
		return errors.New("smtp não configurado (defina SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM)")
	}
	if len(to) == 0 {
		return errors.New("nenhum destinatário informado")
	}
	if strings.TrimSpace(from) == "" {
		from = cfg.From
	}

	addr := fmt.Sprintf("%s:%s", cfg.Host, cfg.Port)
	auth := smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)

	mixed := "mixed_" + randomBoundary()
	alt := "alt_" + randomBoundary()
	icsB64 := wrap76(base64.StdEncoding.EncodeToString([]byte(ics)))

	var b strings.Builder
	fmt.Fprintf(&b, "From: %s\r\n", from)
	fmt.Fprintf(&b, "To: %s\r\n", strings.Join(to, ", "))
	fmt.Fprintf(&b, "Subject: %s\r\n", mime.QEncoding.Encode("UTF-8", subject))
	b.WriteString("MIME-Version: 1.0\r\n")
	fmt.Fprintf(&b, "Content-Type: multipart/mixed; boundary=\"%s\"\r\n\r\n", mixed)

	fmt.Fprintf(&b, "--%s\r\n", mixed)
	fmt.Fprintf(&b, "Content-Type: multipart/alternative; boundary=\"%s\"\r\n\r\n", alt)

	fmt.Fprintf(&b, "--%s\r\n", alt)
	b.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n\r\n")
	b.WriteString(htmlBody)
	b.WriteString("\r\n")

	fmt.Fprintf(&b, "--%s\r\n", alt)
	b.WriteString("Content-Type: text/calendar; charset=\"UTF-8\"; method=REQUEST\r\n")
	b.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
	b.WriteString(icsB64)
	fmt.Fprintf(&b, "\r\n--%s--\r\n", alt)

	fmt.Fprintf(&b, "--%s\r\n", mixed)
	b.WriteString("Content-Type: application/ics; name=\"convite.ics\"\r\n")
	b.WriteString("Content-Disposition: attachment; filename=\"convite.ics\"\r\n")
	b.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")
	b.WriteString(icsB64)
	fmt.Fprintf(&b, "\r\n--%s--\r\n", mixed)

	return smtp.SendMail(addr, auth, cfg.User, to, []byte(b.String()))
}

func randomBoundary() string {
	buf := make([]byte, 12)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

func wrap76(s string) string {
	var b strings.Builder
	for len(s) > 76 {
		b.WriteString(s[:76])
		b.WriteString("\r\n")
		s = s[76:]
	}
	b.WriteString(s)
	return b.String()
}
