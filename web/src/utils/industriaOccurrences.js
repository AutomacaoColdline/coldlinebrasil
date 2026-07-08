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
