// Package authz centralizes the rules for which "services" (industria,
// automation, departamento) a user can reach, and who is allowed to manage
// that access (the identification_number "0001" super-admin).
package authz

import (
	"strings"

	"coldline-api/internal/models"
)

const (
	ServiceIndustria    = "industria"
	ServiceAutomation   = "automation"
	ServiceDepartamento = "departamento"
)

// SuperAdminIdentification is the badge number of the single user allowed to
// manage per-user service access (the "admin automação" account). 0001 is
// now a plain industria-only user; 7777 is the admin master.
const SuperAdminIdentification = "7777"

func normalize(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// IsAdminUser mirrors the frontend's admin detection (AuthContext.jsx
// resolveModule): any user whose type is admin/setup/administrador, or the
// super-admin badge number, is treated as an unrestricted admin.
func IsAdminUser(u *models.User) bool {
	if u == nil {
		return false
	}
	if u.IdentificationNumber == SuperAdminIdentification {
		return true
	}
	typeName := ""
	if u.UserType != nil {
		typeName = normalize(u.UserType.Name)
	}
	return typeName == "admin" || typeName == "setup" || typeName == "administrador"
}

// IsSuperAdmin restricts service-access management to exactly the "0001"
// badge number, regardless of user type.
func IsSuperAdmin(u *models.User) bool {
	return u != nil && u.IdentificationNumber == SuperAdminIdentification
}

// DefaultService mirrors the frontend's legacy single-module resolution for
// users who have never been granted explicit AllowedServices: it decides
// between "industria" and "automation" (never "departamento", which stays
// opt-in only). Admins and assistência técnica users are handled by their
// own checks and never fall through to this default.
func DefaultService(u *models.User) string {
	if u == nil {
		return ""
	}
	typeName := ""
	if u.UserType != nil {
		typeName = normalize(u.UserType.Name)
	}
	deptName := ""
	if u.Department != nil {
		deptName = normalize(u.Department.Name)
	}

	if strings.Contains(typeName, "industria") || strings.Contains(typeName, "indústria") ||
		typeName == "operador" ||
		strings.Contains(deptName, "industria") || strings.Contains(deptName, "indústria") ||
		deptName == "operação" {
		return ServiceIndustria
	}

	return ServiceAutomation
}

// HasServiceAccess is the single source of truth used by the RequireService
// middleware: admins bypass everything, explicit grants win, and anyone
// without explicit grants falls back to their legacy default module
// (industria/automation only — departamento is always opt-in).
func HasServiceAccess(u *models.User, service string) bool {
	if u == nil {
		return false
	}
	if IsAdminUser(u) {
		return true
	}
	if len(u.AllowedServices) > 0 {
		for _, s := range u.AllowedServices {
			if s == service {
				return true
			}
		}
		return false
	}
	return DefaultService(u) == service
}
