export const UNIT_OPTIONS = ['pç', 'cm', 'm', 'm²', 'lt', 'kg', 'cj', 'ct']

export const BUILD_STATUSES = ['Em Andamento', 'Concluído', 'Parado']

export const BUILD_STATUS_TONES = {
  'Em Andamento': 'bg-amber-50 text-amber-600 border-amber-100',
  'Concluído': 'bg-emerald-50 text-emerald-600 border-emerald-100',
  Parado: 'bg-rose-50 text-rose-600 border-rose-100',
}

export function emptyBomLine() {
  return { partId: '', partName: '', unitOfMeasure: 'pç', internalCode: '', supplier: '', quantity: '' }
}

// Um "Modelo Criado ao Cliente" é uma unidade física específica: cliente (ou
// estoque) de destino, pedido/referência, número de série, se tem
// ventiladores (e, nesse caso, o endereçamento desses evaporadores) e o
// status de produção da unidade.
export function emptyBuildForm() {
  return {
    clientName: '',
    orderReference: '',
    serialNumber: '',
    hasEvaporatorAddressing: false,
    evaporatorAddresses: [],
    status: 'Em Andamento',
    notes: '',
  }
}

export function buildToForm(item) {
  return {
    clientName: item.clientName || '',
    orderReference: item.orderReference || '',
    serialNumber: item.serialNumber || '',
    hasEvaporatorAddressing: !!item.hasEvaporatorAddressing,
    evaporatorAddresses: item.evaporatorAddresses || [],
    status: item.status || 'Em Andamento',
    notes: item.notes || '',
  }
}

export function buildToPayload(form) {
  return {
    clientName: form.clientName.trim(),
    orderReference: form.orderReference.trim(),
    serialNumber: form.serialNumber.trim(),
    hasEvaporatorAddressing: !!form.hasEvaporatorAddressing,
    evaporatorAddresses: form.hasEvaporatorAddressing ? (form.evaporatorAddresses || []) : [],
    status: form.status || 'Em Andamento',
    notes: form.notes || '',
  }
}
