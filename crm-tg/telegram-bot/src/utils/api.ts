import { ApiResponse, User, Ticket } from '../types';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

export class ApiClient {
    private static instance: ApiClient;
    private baseUrl: string;

    private constructor() {
        this.baseUrl = API_URL;
    }

    public static getInstance(): ApiClient {
        if (!ApiClient.instance) {
            ApiClient.instance = new ApiClient();
        }
        return ApiClient.instance;
    }

    private async request<T = any>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`;

        const defaultHeaders = {
            'Content-Type': 'application/json',
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...defaultHeaders,
                    ...options.headers,
                },
            });

            const data = await response.json();

            // Логируем запросы в debug режиме
            if (process.env.DEBUG === 'true') {
                console.log(`📤 API Request: ${endpoint}`, {
                    status: response.status,
                    data
                });
            }

            return data as ApiResponse<T>;
        } catch (error) {
            console.error(`❌ API Error (${endpoint}):`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    // Методы для работы с пользователями
    async getUserOrCreate(telegramId: string, name: string): Promise<ApiResponse<User>> {
        return this.request<User>('/users', {
            method: 'POST',
            body: JSON.stringify({ telegramId, name })
        });
    }

    // Методы для работы с заявками
    async createTicket(data: {
        title: string;
        description: string;
        userId: string;
        channel: 'TELEGRAM';
    }): Promise<ApiResponse<Ticket>> {
        return this.request<Ticket>('/tickets', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getUserTickets(userId: string): Promise<ApiResponse<Ticket[]>> {
        return this.request<Ticket[]>(`/tickets?userId=${userId}`);
    }

    async getTicket(ticketId: string): Promise<ApiResponse<Ticket>> {
        return this.request<Ticket>(`/tickets/${ticketId}`);
    }

    // Проверка доступности API
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.request('/tickets');
            return response.success;
        } catch {
            return false;
        }
    }
}

// Экспорт синглтона
export const apiClient = ApiClient.getInstance();