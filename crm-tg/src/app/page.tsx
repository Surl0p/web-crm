'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Ticket {
  id: string
  title: string
  description: string
  status: string
  priority: string
  createdAt: string
  comment?: string
}

interface User {
  id: string
  name: string
  email: string
  telegramId?: string
}

export default function HomePage() {
  const searchParams = useSearchParams()
  const tgIdFromUrl = searchParams.get('tgId')

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: ''
  })

  // Автоматически загружаем пользователя по Telegram ID
  useEffect(() => {
    if (tgIdFromUrl) {
      loadUserFromTelegram(tgIdFromUrl)
    }
  }, [tgIdFromUrl])

  const loadUserFromTelegram = async (telegramId: string) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          name: 'Telegram User'
        })
      })

      const data = await response.json()
      if (data.success && data.data) {
        setCurrentUser(data.data)
        fetchUserTickets(data.data.id)
      }
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const fetchUserTickets = async (userId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tickets?userId=${userId}`)
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

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser?.id) {
      alert('Сначала войдите в систему')
      return
    }

    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      alert('Пожалуйста, заполните все поля')
      return
    }

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTicket.title,
          description: newTicket.description,
          userId: currentUser.id,
          channel: 'WEB'
        })
      })

      const data = await response.json()

      if (data.success) {
        setNewTicket({ title: '', description: '' })
        setShowForm(false)
        fetchUserTickets(currentUser.id)
        alert('✅ Заявка успешно создана!')
      } else {
        alert(`❌ Ошибка: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      alert('Ошибка при создании заявки')
    }
  }

  const handleLogin = (telegramId: string) => {
    loadUserFromTelegram(telegramId)
  }

  return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Шапка */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">CRM для управления заявками ЖКХ</h1>
            <p className="text-gray-600 mt-2">Создавайте и отслеживайте заявки на ремонт и обслуживание</p>

            <div className="mt-6 flex flex-wrap gap-4 items-center">
              {currentUser ? (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <span className="text-gray-700">Вы вошли как: </span>
                    <span className="font-medium">{currentUser.name}</span>
                    {currentUser.telegramId && (
                        <span className="ml-2 text-sm text-gray-500">(Telegram ID: {currentUser.telegramId})</span>
                    )}
                  </div>
              ) : (
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-gray-700">Для работы с заявками войдите через Telegram бота</p>
                    <button
                        onClick={() => handleLogin('123456789')}
                        className="mt-2 text-blue-600 hover:text-blue-800"
                    >
                      Или войдите как тестовый пользователь
                    </button>
                  </div>
              )}

              <Link
                  href="/admin"
                  className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Панель администратора →
              </Link>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Левая колонка - создание заявки */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-bold mb-4">Создать новую заявку</h2>

                {!currentUser ? (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-gray-700 mb-2">Для создания заявки нужно войти в систему</p>
                      <p className="text-sm text-gray-600">
                        1. Откройте Telegram бота<br/>
                        2. Отправьте команду /start<br/>
                        3. Используйте команду /web для получения ссылки
                      </p>
                    </div>
                ) : !showForm ? (
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition"
                    >
                      + Создать заявку
                    </button>
                ) : (
                    <form onSubmit={handleCreateTicket} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Тема заявки *
                        </label>
                        <input
                            type="text"
                            value={newTicket.title}
                            onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                            className="w-full border rounded-lg px-3 py-2"
                            placeholder="Например: Протекает кран на кухне"
                            required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Описание проблемы *
                        </label>
                        <textarea
                            value={newTicket.description}
                            onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                            className="w-full border rounded-lg px-3 py-2 h-32"
                            placeholder="Подробно опишите проблему, укажите адрес, этаж..."
                            required
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                            type="submit"
                            className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition"
                        >
                          Отправить заявку
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
                        >
                          Отмена
                        </button>
                      </div>
                    </form>
                )}

                <div className="mt-6 text-sm text-gray-500">
                  <p className="font-medium">Как это работает:</p>
                  <ul className="mt-2 space-y-1">
                    <li>✓ Создайте заявку здесь или в Telegram боте</li>
                    <li>✓ Администратор получит уведомление</li>
                    <li>✓ Следите за статусом в этом окне</li>
                    <li>✓ Администратор оставит комментарий по ходу работы</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Правая колонка - список заявок */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow">
                <div className="p-6 border-b flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">Мои заявки</h2>
                    <p className="text-gray-600 mt-1">
                      {currentUser ? `Всего заявок: ${tickets.length}` : 'Войдите, чтобы увидеть заявки'}
                    </p>
                  </div>
                  {currentUser && (
                      <button
                          onClick={() => fetchUserTickets(currentUser.id)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Обновить
                      </button>
                  )}
                </div>

                {loading ? (
                    <div className="p-8 text-center">Загрузка заявок...</div>
                ) : !currentUser ? (
                    <div className="p-8 text-center text-gray-500">
                      <p className="mb-2">Войдите в систему, чтобы увидеть свои заявки</p>
                      <p className="text-sm">Используйте Telegram бота или тестовый вход</p>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <p>У вас пока нет заявок.</p>
                      <p className="mt-1">Создайте первую заявку!</p>
                    </div>
                ) : (
                    <div className="divide-y">
                      {tickets.map((ticket) => (
                          <div key={ticket.id} className="p-6 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-medium text-lg">{ticket.title}</h3>
                                <p className="text-gray-600 mt-2">{ticket.description}</p>

                                {ticket.comment && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">Комментарий администратора:</span><br />
                                        {ticket.comment}
                                      </p>
                                    </div>
                                )}
                              </div>

                              <div className="ml-4 text-right min-w-[120px]">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium
                            ${ticket.status === 'NEW' ? 'bg-blue-100 text-blue-800' :
                              ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                                  ticket.status === 'DONE' ? 'bg-green-100 text-green-800' :
                                      'bg-gray-100 text-gray-800'}`}
                          >
                            {ticket.status === 'NEW' ? 'Новая' :
                                ticket.status === 'IN_PROGRESS' ? 'В работе' :
                                    ticket.status === 'DONE' ? 'Завершена' : ticket.status}
                          </span>
                                <p className="text-sm text-gray-500 mt-2">
                                  {new Date(ticket.createdAt).toLocaleDateString('ru-RU')}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Приоритет: {ticket.priority}
                                </p>
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                )}
              </div>

              <div className="mt-6 text-center text-gray-500 text-sm">
                <p>💡 Используйте Telegram-бота для быстрого создания заявок с фото и уведомлениями</p>
              </div>
            </div>
          </div>
        </div>
      </div>
  )
}