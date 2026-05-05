const TOKEN_KEY = 'automation_token'
const USER_KEY  = 'automation_user'
const ID_KEY    = 'automation_id'

const automationStore = {
  getToken: () => sessionStorage.getItem(TOKEN_KEY),
  getUser:  () => {
    try { return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null') } catch { return null }
  },
  getId: () => sessionStorage.getItem(ID_KEY),

  set({ token, user, identificationNumber }) {
    if (token)                sessionStorage.setItem(TOKEN_KEY, token)
    if (user)                 sessionStorage.setItem(USER_KEY, JSON.stringify(user))
    if (identificationNumber) sessionStorage.setItem(ID_KEY, identificationNumber)
  },

  clear() {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(ID_KEY)
  },
}

export default automationStore
