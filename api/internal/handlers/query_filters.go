package handlers

import (
	"strings"
	"time"

	"gorm.io/gorm"
)

func parseQueryTime(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}

	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil, err
	}

	utc := parsed.UTC()
	return &utc, nil
}

func applyRangeOverlapFilter(db *gorm.DB, startColumn, endColumn string, rangeStart, rangeEnd *time.Time) *gorm.DB {
	if rangeStart != nil {
		db = db.Where("COALESCE("+endColumn+", NOW()) >= ?", *rangeStart)
	}
	if rangeEnd != nil {
		db = db.Where(startColumn+" <= ?", *rangeEnd)
	}
	return db
}
