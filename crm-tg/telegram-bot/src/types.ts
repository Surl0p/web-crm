// Основные интерфейсы для работы с API

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface User {
    id: string;
    telegramId: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
}

export interface Ticket {
    id: string;
    title: string;
    description: string;
    status: 'NEW' | 'IN_PROGRESS' | 'WAITING' | 'DONE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    channel: 'WEB' | 'TELEGRAM';
    comment?: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    user?: {
        name: string;
        email: string;
    };
}

export interface UserSession {
    dbUserId?: string;
    creatingTicket?: boolean;
    ticketStep?: 'title' | 'description';
    ticketData?: {
        title: string;
    };
}