function normalizeOccurrenceText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function isSystemOutOfShiftOccurrence(occurrence) {
  const typeName = normalizeOccurrenceText(occurrence?.occurrenceType?.name)
  const description = normalizeOccurrenceText(occurrence?.description)

  return (
    typeName.includes('sistema - fora do expediente') ||
    description.includes('pausa automatica fora do horario de expediente')
  )
}

// Igual à checagem acima, mas pro nome de um occurrence_type (não de uma
// ocorrência já criada) — usado pra tirar "Sistema - Fora do Expediente" das
// listas de motivo de pausa que o operador/admin escolhe manualmente. Esse
// tipo é gerado sozinho pelo scheduler fora do expediente, nunca selecionável.
export function isSystemOccurrenceTypeName(name) {
  return normalizeOccurrenceText(name).includes('sistema - fora do expediente')
}
