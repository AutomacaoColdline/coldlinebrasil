export const UNIT_OPTIONS = ['pç', 'cm', 'm', 'm²', 'lt', 'kg', 'cj', 'ct']

export const SERIAL_STATUSES = ['Em Andamento', 'Concluido', 'Parado']

export const SERIAL_STATUS_TONES = {
  'Em Andamento': 'bg-amber-50 text-amber-600 border-amber-100',
  Concluido: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  Parado: 'bg-rose-50 text-rose-600 border-rose-100',
}

export function emptyBomLine() {
  return { partId: '', partName: '', unitOfMeasure: 'pç', internalCode: '', supplier: '', quantity: '' }
}

export function emptySerialForm() {
  return {
    serialNumber: '',
    clientDestination: '',
    hasEvaporatorAddressing: false,
    evaporatorAddresses: [],
    status: 'Em Andamento',
    notes: '',
  }
}

export function serialToForm(item) {
  return {
    serialNumber: item.serialNumber || '',
    clientDestination: item.clientDestination || '',
    hasEvaporatorAddressing: !!item.hasEvaporatorAddressing,
    evaporatorAddresses: item.evaporatorAddresses || [],
    status: item.status || 'Em Andamento',
    notes: item.notes || '',
  }
}

export function serialToPayload(form) {
  return {
    serialNumber: form.serialNumber,
    clientDestination: form.clientDestination,
    hasEvaporatorAddressing: !!form.hasEvaporatorAddressing,
    evaporatorAddresses: form.hasEvaporatorAddressing ? (form.evaporatorAddresses || []) : [],
    status: form.status || 'Em Andamento',
    notes: form.notes || '',
  }
}
