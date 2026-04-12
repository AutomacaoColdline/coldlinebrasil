import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useApi } from '../hooks/useApi'
import { apiClient } from '../services/api'
import { Trash2, Plus, Edit2 } from 'lucide-react'

export function AdminServices() {
  const { user, isAuthenticated } = useAuth()
  const { call, loading: apiLoading } = useApi()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ name: '', description: '', icon: '' })
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    try {
      const data = await apiClient.getServices()
      setServices(data || [])
    } catch (error) {
      console.error('Erro ao carregar serviços:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.description) return

    setSubmitting(true)
    try {
      if (editingId) {
        await apiClient.updateService(
          editingId,
          formData.name,
          formData.description,
          formData.icon
        )
      } else {
        await apiClient.createService(
          formData.name,
          formData.description,
          formData.icon
        )
      }
      setFormData({ name: '', description: '', icon: '' })
      setEditingId(null)
      await loadServices()
    } catch (error) {
      alert('Erro: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este serviço?')) return

    try {
      await apiClient.deleteService(id)
      await loadServices()
    } catch (error) {
      alert('Erro: ' + error.message)
    }
  }

  const handleEdit = (service) => {
    setFormData({
      name: service.name,
      description: service.description,
      icon: service.icon,
    })
    setEditingId(service.id)
  }

  if (!isAuthenticated) {
    return <div className="p-6 text-red-500">Você precisa estar autenticado</div>
  }

  if (user?.role !== 'admin') {
    return <div className="p-6 text-red-500">Acesso restrito a administradores</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Gerenciar Serviços</h1>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-lg mb-8 space-y-4"
      >
        <h2 className="text-xl font-semibold">
          {editingId ? 'Editar' : 'Novo'} Serviço
        </h2>

        <input
          type="text"
          placeholder="Nome do Serviço"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
          required
        />

        <textarea
          placeholder="Descrição"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          rows={4}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 resize-none"
          required
        />

        <input
          type="text"
          placeholder="Ícone (nome do lucide-react)"
          value={formData.icon}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, icon: e.target.value }))
          }
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
        />

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : editingId ? 'Atualizar' : 'Criar'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null)
                setFormData({ name: '', description: '', icon: '' })
              }}
              className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Services List */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Serviços</h2>
        {loading ? (
          <p className="text-gray-500">Carregando...</p>
        ) : services.length === 0 ? (
          <p className="text-gray-500">Nenhum serviço cadastrado</p>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-600"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{service.name}</h3>
                    <p className="text-gray-600 mt-2">{service.description}</p>
                    {service.icon && (
                      <p className="text-gray-500 text-sm mt-1">
                        Ícone: {service.icon}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(service)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminServices
