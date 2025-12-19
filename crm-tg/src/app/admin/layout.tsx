'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface AdminUser {
    id: string
    email: string
    name: string
    role: string
}

export default function AdminLayout({
                                        children,
                                    }: {
    children: React.ReactNode
}) {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [loading, setLoading] = useState(true)
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = () => {
        // Простая проверка - в реальном проекте используйте JWT
        const token = localStorage.getItem('admin_token')
        const userStr = localStorage.getItem('admin_user')

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr)
                if (user.role === 'ADMIN') {
                    setIsAuthenticated(true)
                    setAdminUser(user)
                } else {
                    router.push('/admin/login')
                }
            } catch {
                router.push('/admin/login')
            }
        } else {
            router.push('/admin/login')
        }
        setLoading(false)
    }

    const handleLogout = () => {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        router.push('/admin/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Проверка авторизации...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return null
    }

    const navItems = [
        { href: '/admin', label: 'Заявки', active: pathname === '/admin' },
        { href: '/admin/users', label: 'Пользователи', active: pathname === '/admin/users' },
        { href: '/admin/settings', label: 'Настройки', active: pathname === '/admin/settings' },
    ]

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Шапка админки */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Админ-панель CRM ЖКХ</h1>
                            <p className="text-sm text-gray-600">Управление заявками и пользователями</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm font-medium">{adminUser?.name}</p>
                                <p className="text-xs text-gray-500">{adminUser?.email}</p>
                            </div>

                            <div className="flex gap-2">
                                <Link
                                    href="/"
                                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                                    target="_blank"
                                >
                                    Веб-вью
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    Выйти
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Навигация */}
                    <nav className="mt-4 flex gap-6 border-t pt-4">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`px-3 py-2 text-sm font-medium rounded ${
                                    item.active
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {children}
            </main>

            <footer className="mt-8 border-t pt-4 text-center text-sm text-gray-500">
                <p>CRM система для управления заявками ЖКХ • {new Date().getFullYear()}</p>
            </footer>
        </div>
    )
}