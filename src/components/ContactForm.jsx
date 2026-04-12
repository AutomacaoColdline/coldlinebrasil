import { useState } from 'react'
import { useContacts } from '../hooks/useApi'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const { createContact, loading, error } = useContacts()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createContact(
        formData.name,
        formData.email,
        formData.phone,
        formData.message
      )
      setShowSuccess(true)
      setFormData({ name: '', email: '', phone: '', message: '' })
      setTimeout(() => setShowSuccess(false), 5000)
    } catch (err) {
      // Error is handled by the hook
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md mx-auto space-y-4 p-6 bg-white/5 backdrop-blur border border-white/10 rounded-lg"
    >
      <h3 className="text-xl font-bold text-white mb-6">Solicitar Orçamento</h3>

      {showSuccess && (
        <div className="flex items-center gap-3 p-3 bg-green-500/20 border border-green-500 rounded-lg">
          <CheckCircle size={20} className="text-green-400" />
          <p className="text-green-100 text-sm">Mensagem enviada com sucesso!</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-3 bg-red-500/20 border border-red-500 rounded-lg">
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-red-100 text-sm">{error}</p>
        </div>
      )}

      <input
        type="text"
        name="name"
        placeholder="Seu Nome"
        value={formData.name}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-brand-mid transition"
      />

      <input
        type="email"
        name="email"
        placeholder="Seu Email"
        value={formData.email}
        onChange={handleChange}
        required
        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-brand-mid transition"
      />

      <input
        type="tel"
        name="phone"
        placeholder="Seu Telefone"
        value={formData.phone}
        onChange={handleChange}
        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-brand-mid transition"
      />

      <textarea
        name="message"
        placeholder="Descreva sua necessidade"
        value={formData.message}
        onChange={handleChange}
        required
        rows={4}
        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-brand-mid transition resize-none"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-gradient-to-r from-brand-mid to-brand-light text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Enviando...' : 'Enviar Solicitação'}
      </button>
    </form>
  )
}
