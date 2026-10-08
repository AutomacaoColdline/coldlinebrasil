// Aviso global quando a API recusa uma ação pelo nível de acesso do módulo
// (403 com code "access_level": "Somente visualizar" tentando salvar, ou
// "Visualizar e editar" tentando excluir). Fica fora do React de propósito
// pra funcionar a partir de qualquer instância do axios.
let hideTimer = null

export function showAccessNoticeIfNeeded(err) {
  const data = err?.response?.data
  if (err?.response?.status !== 403 || data?.code !== 'access_level') return
  if (typeof document === 'undefined') return

  let box = document.getElementById('access-level-notice')
  if (!box) {
    box = document.createElement('div')
    box.id = 'access-level-notice'
    box.setAttribute('role', 'alert')
    Object.assign(box.style, {
      position: 'fixed',
      left: '50%',
      bottom: '24px',
      transform: 'translateX(-50%)',
      zIndex: '9999',
      maxWidth: 'calc(100% - 32px)',
      padding: '12px 18px',
      borderRadius: '14px',
      background: '#991b1b',
      color: '#fff',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
      textAlign: 'center',
    })
    document.body.appendChild(box)
  }
  box.textContent = `🔒 ${data.message || 'Você não tem permissão para esta ação.'}`
  box.style.display = 'block'
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => { box.style.display = 'none' }, 5000)
}
