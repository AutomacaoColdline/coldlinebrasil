package handlers

import (
	"testing"
	"time"
)

func TestParsePeriodRange(t *testing.T) {
	start, end, err := parsePeriodRange("2026-05-04T10:00:00-03:00", "2026-05-04T12:30:00-03:00")
	if err != nil {
		t.Fatalf("esperava sucesso, recebeu erro: %v", err)
	}
	if start.Location() != time.UTC || end.Location() != time.UTC {
		t.Fatalf("esperava datas normalizadas em UTC")
	}
	if !end.After(start) {
		t.Fatalf("esperava end > start")
	}
}

func TestParsePeriodRangeInvalid(t *testing.T) {
	_, _, err := parsePeriodRange("", "2026-05-04T12:30:00Z")
	if err == nil {
		t.Fatalf("esperava erro para parâmetros vazios")
	}
	_, _, err = parsePeriodRange("2026-05-04T12:30:00Z", "2026-05-04T11:30:00Z")
	if err == nil {
		t.Fatalf("esperava erro quando end <= start")
	}
}

func TestOverlapSecondsPartial(t *testing.T) {
	aStart := time.Date(2026, 5, 4, 8, 0, 0, 0, time.UTC)
	aEnd := time.Date(2026, 5, 4, 12, 0, 0, 0, time.UTC)
	bStart := time.Date(2026, 5, 4, 10, 0, 0, 0, time.UTC)
	bEnd := time.Date(2026, 5, 4, 11, 0, 0, 0, time.UTC)
	secs := overlapSeconds(aStart, aEnd, bStart, bEnd)
	if secs != 3600 {
		t.Fatalf("esperava 3600 segundos, recebeu %.0f", secs)
	}
}

func TestOverlapSecondsNoIntersection(t *testing.T) {
	aStart := time.Date(2026, 5, 4, 8, 0, 0, 0, time.UTC)
	aEnd := time.Date(2026, 5, 4, 9, 0, 0, 0, time.UTC)
	bStart := time.Date(2026, 5, 4, 10, 0, 0, 0, time.UTC)
	bEnd := time.Date(2026, 5, 4, 11, 0, 0, 0, time.UTC)
	secs := overlapSeconds(aStart, aEnd, bStart, bEnd)
	if secs != 0 {
		t.Fatalf("esperava 0 segundos, recebeu %.0f", secs)
	}
}
