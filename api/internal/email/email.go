// Package email envia emails transacionais (recuperação de senha) via SMTP,
// pensado para uso com Google Workspace (smtp.gmail.com:587 + senha de app).
package email

import (
	"errors"
	"fmt"
	"net/smtp"
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

// Send manda um email HTML simples. net/smtp.SendMail faz upgrade automático
// para STARTTLS quando o servidor anuncia suporte (caso do Gmail/Workspace
// na porta 587), então não é preciso lidar com TLS manualmente aqui.
func Send(cfg Config, to, subject, htmlBody string) error {
	if !cfg.configured() {
		return errors.New("smtp não configurado (defina SMTP_HOST/SMTP_USER/SMTP_PASS/EMAIL_FROM)")
	}

	addr := fmt.Sprintf("%s:%s", cfg.Host, cfg.Port)
	auth := smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)

	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=\"UTF-8\"\r\n\r\n%s\r\n",
		cfg.From, to, subject, htmlBody,
	)

	return smtp.SendMail(addr, auth, cfg.User, []string{to}, []byte(msg))
}
