function normalize(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

// Regra de negócio: na Indústria só entra usuário com Tipo "Operador".
export function isIndustriaOperatorUser(user) {
  return normalize(user?.userType?.name) === 'operador'
}

export function isOperatorUserType(userType) {
  return normalize(userType?.name) === 'operador'
}
