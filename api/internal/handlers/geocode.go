package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"coldline-api/internal/models"
)

type nominatimItem struct {
	Lat string `json:"lat"`
	Lon string `json:"lon"`
}

// geocodeAddress resolves an address into lon/lat using OSM Nominatim.
// Returns nil,nil when the address cannot be resolved.
func geocodeAddress(ctx context.Context, address string) (*models.GeoPoint, error) {
	q := strings.TrimSpace(address)
	if q == "" {
		return nil, nil
	}

	u := fmt.Sprintf(
		"https://nominatim.openstreetmap.org/search?format=json&limit=1&q=%s",
		url.QueryEscape(q),
	)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	// Nominatim requires a custom User-Agent.
	req.Header.Set("User-Agent", "coldline-assistencia/1.0 (internal geocoder)")

	client := &http.Client{Timeout: 12 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var items []nominatimItem
	if err := json.NewDecoder(resp.Body).Decode(&items); err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, nil
	}

	lat, err1 := strconv.ParseFloat(items[0].Lat, 64)
	lon, err2 := strconv.ParseFloat(items[0].Lon, 64)
	if err1 != nil || err2 != nil {
		return nil, nil
	}
	return models.NewGeoPoint(lat, lon), nil
}
