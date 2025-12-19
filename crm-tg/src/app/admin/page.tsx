'use client'

import { useEffect, useState } from 'react'

interface Ticket {
    id: string
    title: string
    description: string
    status: string
    priority: string
    channel: string
    createdAt: string
    comment?: string
    user: {
        name: string
        email: string
        telegramId?: string
    }
}

export default function AdminPage() {
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState<string>('')
    const [editingComment, setEditingComment] = useState<{ [key: string]: string }>({})

    useEffect(() => {
        fetchTickets()
    }, [filterStatus])

    const fetchTickets = async () => {
        setLoading(true)
        try {
            const url = filterStatus ? `/api/tickets?status=${filterStatus}` : '/api/tickets'
            const response = await fetch(url)
            const data = await response.json()

            if (data.success) {
                setTickets(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching tickets:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateTicketStatus = async (ticketId: string, newStatus: string) => {
        try {
            const response = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })

            const data = await response.json()
            if (data.success) {
                fetchTickets()
            }
        } catch (error) {
            console.error('Error updating ticket:', error)
            alert('Ошибка при обновлении статуса')
        }
    }

    const saveComment = async (ticketId: string) => {
        const comment = editingComment[ticketId]
        if (comment === undefined) return

        try {
            const response = await fetch(`/api/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment })
            })

            const data = await response.json()
            if (data.success) {
                // Сбрасываем поле редактирования
                setEditingComment(prev => {
                    const newState = { ...prev }
                    delete newState[ticketId]
                    return newState
                })
                fetchTickets()
            }
        } catch (error) {
            console.error('Error saving comment:', error)
            alert('Ошибка при сохранении комментария')
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'NEW': return 'bg-blue-100 text-blue-800'
            case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800'
            case 'DONE': return 'bg-green-100 text-green-800'
            case 'WAITING': return 'bg-purple-100 text-purple-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'NEW': return 'Новая'
            case 'IN_PROGRESS': return 'В работе'
            case 'DONE': return 'Завершена'
            case 'WAITING': return 'Ожидание'
            default: return status
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'HIGH': return 'bg-red-100 text-red-800'
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
            case 'LOW': return 'bg-green-100 text-green-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Загрузка заявок...</p>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Управление заявками</h1>
                    <p className="text-gray-600 mt-1">Всего заявок: {tickets.length}</p>
                </div>

                <div className="flex gap-4">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="border rounded-lg px-3 py-2"
                    >
                        <option value="">Все статусы</option>
                        <option value="NEW">Новые</option>
                        <option value="IN_PROGRESS">В работе</option>
                        <option value="WAITING">Ожидание</option>
                        <option value="DONE">Завершенные</option>
                    </select>

                    <button
                        onClick={fetchTickets}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                    >
                        Обновить
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Заявка
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Пользователь
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Статус
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Приоритет
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Комментарий
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Действия
                            </th>
                        </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                        {tickets.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    Заявок не найдено
                                </td>
                            </tr>
                        ) : (
                            tickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">{ticket.title}</p>
                                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ticket.description}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(ticket.createdAt).toLocaleDateString('ru-RU')} • {ticket.channel}
                                            </p>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium">{ticket.user.name}</p>
                                            <p className="text-sm text-gray-500">{ticket.user.email}</p>
                                            {ticket.user.telegramId && (
                                                <p className="text-xs text-gray-400">TG: {ticket.user.telegramId}</p>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <select
                                            value={ticket.status}
                                            onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                                            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}
                                        >
                                            <option value="NEW">Новая</option>
                                            <option value="IN_PROGRESS">В работе</option>
                                            <option value="WAITING">Ожидание</option>
                                            <option value="DONE">Завершена</option>
                                        </select>
                                    </td>

                                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                                    </td>

                                    <td className="px-6 py-4">
                                        {editingComment[ticket.id] !== undefined ? (
                                            <div className="space-y-2">
                          <textarea
                              value={editingComment[ticket.id]}
                              onChange={(e) => setEditingComment({
                                  ...editingComment,
                                  [ticket.id]: e.target.value
                              })}
                              className="w-full border rounded px-2 py-1 text-sm"
                              rows={2}
                              placeholder="Введите комментарий..."
                          />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => saveComment(ticket.id)}
                                                        className="text-sm bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                                                    >
                                                        Сохранить
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingComment(prev => {
                                                                const newState = { ...prev }
                                                                delete newState[ticket.id]
                                                                return newState
                                                            })
                                                        }}
                                                        className="text-sm bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                                                    >
                                                        Отмена
                                                    </button>
                                                </div>
                                            </div>
                                        ) : ticket.comment ? (
                                            <div>
                                                <p className="text-sm text-gray-700">{ticket.comment}</p>
                                                <button
                                                    onClick={() => setEditingComment({
                                                        ...editingComment,
                                                        [ticket.id]: ticket.comment || ''
                                                    })}
                                                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                                                >
                                                    Изменить
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setEditingComment({
                                                    ...editingComment,
                                                    [ticket.id]: ''
                                                })}
                                                className="text-sm text-blue-600 hover:text-blue-800"
                                            >
                                                + Добавить комментарий
                                            </button>
                                        )}
                                    </td>

                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateTicketStatus(ticket.id, 'IN_PROGRESS')}
                                                className="text-sm bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                                            >
                                                В работу
                                            </button>
                                            <button
                                                onClick={() => updateTicketStatus(ticket.id, 'DONE')}
                                                className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                                            >
                                                Завершить
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-4 text-sm text-gray-500">
                <p>Статусы:
                    <span className="ml-2 inline-flex items-center">
            <span className="w-3 h-3 bg-blue-100 rounded-full mr-1"></span>
            Новые
          </span>
                    <span className="ml-4 inline-flex items-center">
            <span className="w-3 h-3 bg-yellow-100 rounded-full mr-1"></span>
            В работе
          </span>
                    <span className="ml-4 inline-flex items-center">
            <span className="w-3 h-3 bg-green-100 rounded-full mr-1"></span>
            Завершены
          </span>
                </p>
            </div>
        </div>
    )
}