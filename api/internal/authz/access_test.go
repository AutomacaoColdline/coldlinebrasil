package authz

import (
	"testing"

	"coldline-api/internal/models"
)

func TestServiceLevel(t *testing.T) {
	viewer := &models.User{
		AllowedServices: []string{ServiceAutomation, ServiceIndustria},
		ServiceLevels:   map[string]string{ServiceAutomation: LevelView},
	}
	if got := ServiceLevel(viewer, ServiceAutomation); got != LevelView {
		t.Fatalf("automação = %q, esperado view", got)
	}
	// Liberado sem nível definido: acesso completo (comportamento antigo).
	if got := ServiceLevel(viewer, ServiceIndustria); got != LevelDelete {
		t.Fatalf("indústria = %q, esperado delete", got)
	}
	if got := ServiceLevel(viewer, ServiceDepartamento); got != "" {
		t.Fatalf("departamento = %q, esperado sem acesso", got)
	}

	admin := &models.User{IdentificationNumber: SuperAdminIdentification, ServiceLevels: map[string]string{ServiceAutomation: LevelView}}
	if got := ServiceLevel(admin, ServiceAutomation); got != LevelDelete {
		t.Fatalf("admin = %q, esperado delete", got)
	}
}

func TestLevelAllowsByMethod(t *testing.T) {
	cases := []struct {
		level, method string
		want          bool
	}{
		{LevelView, "GET", true},
		{LevelView, "POST", false},
		{LevelView, "PUT", false},
		{LevelView, "DELETE", false},
		{LevelEdit, "PATCH", true},
		{LevelEdit, "DELETE", false},
		{LevelDelete, "DELETE", true},
		{"", "GET", false},
	}
	for _, tc := range cases {
		if got := LevelAllows(tc.level, RequiredLevel(tc.method)); got != tc.want {
			t.Errorf("nível %q método %s = %v, esperado %v", tc.level, tc.method, got, tc.want)
		}
	}
}
