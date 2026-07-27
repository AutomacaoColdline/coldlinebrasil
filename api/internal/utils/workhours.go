package utils

import (
	"fmt"
	"os"
	"time"
)

// Working shift timezone (default: MS/Campo Grande): 07:30-11:30 and 13:00-17:30
var workLoc = mustLoadLocation(os.Getenv("WORK_TZ"))

// Location expõe o fuso horário do turno de trabalho (America/Campo_Grande
// por padrão) pra quem precisa formatar datas pro horário local da operação,
// fora dos cálculos de jornada.
func Location() *time.Location { return workLoc }

func mustLoadLocation(name string) *time.Location {
	if name == "" {
		name = "America/Campo_Grande"
	}
	loc, err := time.LoadLocation(name)
	if err != nil {
		// Fallback seguro para ambiente sem tzdata:
		// operação usa horário comercial de MS (UTC-4, sem DST atualmente).
		return time.FixedZone("AMT", -4*60*60)
	}
	return loc
}

type shiftWindow struct{ startMin, endMin int } // minutes from local midnight

var shiftWindows = []shiftWindow{
	{7*60 + 30, 11*60 + 30}, // 07:30-11:30
	{13*60 + 0, 17*60 + 30}, // 13:00-17:30
}

// WorkingSeconds returns seconds elapsed between start and end that fall within
// working-shift windows, excluding weekends.
func WorkingSeconds(start, end time.Time) int {
	s, e := start.In(workLoc), end.In(workLoc)
	if !e.After(s) {
		return 0
	}
	total := 0
	day := time.Date(s.Year(), s.Month(), s.Day(), 0, 0, 0, 0, workLoc)
	lastDay := time.Date(e.Year(), e.Month(), e.Day(), 0, 0, 0, 0, workLoc)
	for !day.After(lastDay) {
		wd := day.Weekday()
		if wd != time.Saturday && wd != time.Sunday {
			for _, w := range shiftWindows {
				wStart := day.Add(time.Duration(w.startMin) * time.Minute)
				wEnd := day.Add(time.Duration(w.endMin) * time.Minute)
				oStart := s
				if wStart.After(oStart) {
					oStart = wStart
				}
				oEnd := e
				if wEnd.Before(oEnd) {
					oEnd = wEnd
				}
				if oEnd.After(oStart) {
					total += int(oEnd.Sub(oStart).Seconds())
				}
			}
		}
		day = day.Add(24 * time.Hour)
	}
	return total
}

// FormatSeconds formats working seconds as HH:MM:SS.
func FormatSeconds(secs int) string {
	h := secs / 3600
	m := (secs % 3600) / 60
	s := secs % 60
	return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
}

// ShiftEvent represents a shift boundary.
type ShiftEvent struct {
	At      time.Time
	IsStart bool // true = shift starting, false = shift ending
	Name    string
}

type rawEvent struct {
	min     int
	isStart bool
	name    string
}

var shiftEvents = []rawEvent{
	{7*60 + 30, true, "Início turno manhã"},
	{11*60 + 30, false, "Fim turno manhã"},
	{13*60 + 0, true, "Início turno tarde"},
	{17*60 + 30, false, "Fim do expediente"},
}

// NextShiftEvent returns the next shift boundary event after `after`.
func NextShiftEvent(after time.Time) ShiftEvent {
	t := after.In(workLoc)
	for d := 0; d < 10; d++ {
		day := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, workLoc).AddDate(0, 0, d)
		if day.Weekday() == time.Saturday || day.Weekday() == time.Sunday {
			continue
		}
		for _, e := range shiftEvents {
			at := day.Add(time.Duration(e.min) * time.Minute)
			if at.After(t) {
				return ShiftEvent{At: at.UTC(), IsStart: e.isStart, Name: e.name}
			}
		}
	}
	// fallback: tomorrow morning
	return ShiftEvent{At: t.Add(24 * time.Hour).UTC(), IsStart: true, Name: "fallback"}
}

// IsWorkingTime returns true if t falls within a working-shift window.
func IsWorkingTime(t time.Time) bool {
	local := t.In(workLoc)
	if local.Weekday() == time.Saturday || local.Weekday() == time.Sunday {
		return false
	}
	minOfDay := local.Hour()*60 + local.Minute()
	for _, w := range shiftWindows {
		if minOfDay >= w.startMin && minOfDay < w.endMin {
			return true
		}
	}
	return false
}
