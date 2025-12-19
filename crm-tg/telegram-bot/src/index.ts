import { Bot, Context, Keyboard, InlineKeyboard } from 'grammy';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Загрузка конфигурации
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_URL = process.env.API_URL || 'http://localhost:3000/api';

// Определяем типы локально (на случай проблем с импортами)
interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

interface User {
    id: string;
    telegramId: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
}

interface Ticket {
    id: string;
    title: string;
    description: string;
    status: string;
    createdAt: string;
    comment?: string;
    user?: {
        name: string;
        email: string;
    };
}

interface UserSession {
    dbUserId?: string;
    creatingTicket?: boolean;
    ticketStep?: 'title' | 'description';
    ticketData?: {
        title: string;
    };
}

// Валидация конфигурации
if (!BOT_TOKEN) {
    console.error('❌ ОШИБКА: BOT_TOKEN не найден в .env файле!');
    console.error('Добавьте в telegram-bot/.env:');
    console.error('BOT_TOKEN="ваш_токен_от_BotFather"');
    process.exit(1);
}

console.log('='.repeat(50));
console.log('🤖 ЗАПУСК ТЕЛЕГРАМ БОТА ДЛЯ CRM ЖКХ');
console.log('Время:', new Date().toLocaleString());
console.log('API URL:', API_URL);
console.log('='.repeat(50));

// Инициализация бота
const bot = new Bot(BOT_TOKEN);

// Хранилище сессий пользователей
const userSessions = new Map<number, UserSession>();

// Меню команд
const commands = [
    { command: 'start', description: 'Начать работу с ботом' },
    { command: 'new', description: 'Создать новую заявку' },
    { command: 'my', description: 'Мои заявки' },
    { command: 'web', description: 'Открыть веб-кабинет' },
    { command: 'help', description: 'Помощь по командам' },
    { command: 'status', description: 'Статус системы' },
];

// Установка команд бота
bot.api.setMyCommands(commands).catch(console.error);

// ===================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ API =====================

async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            return {
                success: false,
                error: `HTTP ${response.status}: ${response.statusText}`
            };
        }

        // Используем тип assertion для избежания ошибки TypeScript
        const data = await response.json() as ApiResponse<T>;
        return data;
    } catch (error) {
        console.error(`❌ API Error (${endpoint}):`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error'
        };
    }
}

// Специализированные функции API
async function getUserOrCreate(telegramId: string, name: string): Promise<ApiResponse<User>> {
    return apiRequest<User>('/users', {
        method: 'POST',
        body: JSON.stringify({ telegramId, name })
    });
}

async function createTicket(data: {
    title: string;
    description: string;
    userId: string;
    channel: 'TELEGRAM';
}): Promise<ApiResponse<Ticket>> {
    return apiRequest<Ticket>('/tickets', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function getUserTickets(userId: string): Promise<ApiResponse<Ticket[]>> {
    return apiRequest<Ticket[]>(`/tickets?userId=${userId}`);
}

// ===================== КОМАНДЫ БОТА =====================

// /start - Начало работы
bot.command('start', async (ctx) => {
    const userId = ctx.from?.id;
    const userName = ctx.from?.first_name || 'Пользователь';

    if (!userId) {
        return ctx.reply('❌ Не удалось получить ваш ID');
    }

    try {
        // Регистрация/получение пользователя
        const userResponse = await getUserOrCreate(userId.toString(), userName);

        if (userResponse.success && userResponse.data) {
            // Сохраняем ID пользователя в сессии
            userSessions.set(userId, {
                dbUserId: userResponse.data.id,
            });

            // Приветственное сообщение
            const welcomeMessage = `
👋 Привет, ${userName}!

Я - бот для управления заявками ЖКХ. 
С моей помощью вы можете:

✅ Создавать заявки на ремонт
✅ Отслеживать статус заявок
✅ Получать уведомления от администратора
✅ Переходить в веб-кабинет

📋 *Доступные команды:*
/new - Создать заявку
/my - Мои заявки  
/web - Веб-кабинет
/help - Помощь

💡 *Совет:* Для быстрого создания заявки используйте команду /new
      `;

            // Клавиатура с основными действиями
            const mainKeyboard = new Keyboard()
                .text('📝 Создать заявку')
                .row()
                .text('📋 Мои заявки')
                .text('🌐 Веб-кабинет')
                .row()
                .text('❓ Помощь')
                .resized();

            await ctx.reply(welcomeMessage, {
                parse_mode: 'Markdown',
                reply_markup: mainKeyboard,
            });
        } else {
            await ctx.reply(`❌ Ошибка при регистрации: ${userResponse.error || 'Неизвестная ошибка'}`);
        }
    } catch (error) {
        console.error('Error in /start:', error);
        await ctx.reply('⚠️ Произошла ошибка. Пожалуйста, попробуйте позже.');
    }
});

// /new - Создание заявки
bot.command('new', async (ctx) => {
    await startTicketCreation(ctx);
});

// /my - Просмотр заявок
bot.command('my', async (ctx) => {
    await showUserTickets(ctx);
});

// /web - Веб-кабинет
bot.command('web', async (ctx) => {
    const userId = ctx.from?.id;

    if (!userId) {
        return ctx.reply('❌ Не удалось получить ваш ID');
    }

    const webUrl = `http://localhost:3000?tgId=${userId}`;
    const message = `
🌐 *Ваш веб-кабинет*

Откройте эту ссылку в браузере:
${webUrl}

📱 *Что доступно в веб-кабинете:*
• Подробный просмотр заявок
• История обращений
• Статусы в реальном времени
• Комментарии администратора

💡 *Совет:* Закрепите эту ссылку в закладках для быстрого доступа
  `;

    await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
            .url('Открыть веб-кабинет', webUrl)
    });
});

// /help - Помощь
bot.command('help', async (ctx) => {
    const helpMessage = `
🆘 *Помощь по боту CRM ЖКХ*

📋 *Основные команды:*
/start - Начать работу с ботом
/new - Создать новую заявку
/my - Просмотреть мои заявки  
/web - Открыть веб-кабинет
/help - Эта справка
/status - Статус системы

📝 *Создание заявки:*
1. Нажмите "Создать заявку" или отправьте /new
2. Введите заголовок заявки
3. Подробно опишите проблему
4. Заявка будет отправлена администратору

📊 *Просмотр заявок:*
• Используйте команду /my
• Видите статусы: Новая, В работе, Завершена
• Администратор оставляет комментарии

🌐 *Веб-кабинет:*
• Подробная информация по заявкам
• История всех обращений
• Удобный интерфейс на компьютере

📞 *Поддержка:*
Если возникли проблемы, обратитесь к администратору системы.
  `;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// /status - Статус системы
bot.command('status', async (ctx) => {
    try {
        // Проверяем доступность API
        const testResponse = await apiRequest('/tickets');

        const statusMessage = `
🟢 *Статус системы*

✅ Бот работает нормально
${testResponse.success ? '✅ API сервер доступен' : '❌ API сервер недоступен'}
${testResponse.success ? `✅ Заявок в системе: ${Array.isArray(testResponse.data) ? testResponse.data.length : '?'}` : ''}

📊 *Статистика:*
Пользователей в сессии: ${userSessions.size}

🕐 Время сервера: ${new Date().toLocaleString('ru-RU')}

💡 ${testResponse.success ? 'Все системы работают в штатном режиме.' : 'Проверьте запущен ли основной проект.'}
    `;

        await ctx.reply(statusMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error in /status:', error);
        await ctx.reply('⚠️ *Статус системы:* Ошибка при проверке', {
            parse_mode: 'Markdown'
        });
    }
});

// ===================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====================

/**
 * Начинает процесс создания заявки
 */
async function startTicketCreation(ctx: Context) {
    const userId = ctx.from?.id;

    if (!userId) return;

    try {
        // Получаем или создаем пользователя
        const userResponse = await getUserOrCreate(
            userId.toString(),
            ctx.from?.first_name || 'Пользователь'
        );

        if (!userResponse.success || !userResponse.data?.id) {
            return ctx.reply(`❌ Ошибка: не удалось найти пользователя. ${userResponse.error || 'Попробуйте /start сначала.'}`);
        }

        // Устанавливаем состояние создания заявки
        userSessions.set(userId, {
            dbUserId: userResponse.data.id,
            creatingTicket: true,
            ticketStep: 'title',
        });

        await ctx.reply(
            '📝 *Создание новой заявки*\n\n' +
            'Шаг 1 из 2: Введите *заголовок* заявки\n\n' +
            '💡 *Примеры:*\n' +
            '• "Протекает кран на кухне"\n' +
            '• "Не работает лифт в подъезде 2"\n' +
            '• "Требуется замена лампочки на 3 этаже"\n\n' +
            '❌ Для отмены отправьте "отмена"',
            { parse_mode: 'Markdown' }
        );
    } catch (error) {
        console.error('Error starting ticket creation:', error);
        await ctx.reply('❌ Ошибка при начале создания заявки.');
    }
}

/**
 * Обрабатывает шаги создания заявки
 */
async function handleTicketCreation(ctx: Context, session: UserSession, text: string) {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (text.toLowerCase() === 'отмена') {
        userSessions.set(userId, { dbUserId: session.dbUserId });
        await ctx.reply('❌ Создание заявки отменено.');
        return;
    }

    if (session.ticketStep === 'title') {
        // Сохраняем заголовок
        userSessions.set(userId, {
            ...session,
            ticketData: { title: text },
            ticketStep: 'description',
        });

        await ctx.reply(
            '📝 *Создание новой заявки*\n\n' +
            'Шаг 2 из 2: Введите *описание* проблемы\n\n' +
            '💡 *Что указать в описании:*\n' +
            '• Подробное описание проблемы\n' +
            '• Адрес (квартира, подъезд, этаж)\n' +
            '• Когда началась проблема\n' +
            '• Фотографии можно прикрепить отдельно\n\n' +
            '❌ Для отмены отправьте "отмена"',
            { parse_mode: 'Markdown' }
        );
    } else if (session.ticketStep === 'description') {
        try {
            if (!session.dbUserId) {
                throw new Error('User ID not found in session');
            }

            // Создаем заявку через API
            const ticketResponse = await createTicket({
                title: session.ticketData?.title || 'Без заголовка',
                description: text,
                userId: session.dbUserId,
                channel: 'TELEGRAM',
            });

            if (ticketResponse.success && ticketResponse.data) {
                // Сбрасываем состояние
                userSessions.set(userId, { dbUserId: session.dbUserId });

                const ticket = ticketResponse.data;
                const ticketNumber = ticket.id.slice(0, 8).toUpperCase();

                const successMessage = `
✅ *Заявка успешно создана!*

📋 *Детали заявки:*
🔸 Номер: ${ticketNumber}
🔸 Заголовок: ${ticket.title}
🔸 Статус: Новая
🔸 Дата: ${new Date(ticket.createdAt).toLocaleDateString('ru-RU')}

👷 *Что дальше:*
• Администратор получит уведомление
• Статус будет меняться по мере работы
• Вы получите комментарии от администратора

📊 *Для отслеживания статуса:*
• Используйте команду /my
• Или откройте веб-кабинет /web

💡 Заявка будет рассмотрена в ближайшее время!
        `;

                await ctx.reply(successMessage, { parse_mode: 'Markdown' });
            } else {
                await ctx.reply(`❌ Ошибка при создании заявки: ${ticketResponse.error || 'Неизвестная ошибка'}`);
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            await ctx.reply('❌ Произошла ошибка при создании заявки. Попробуйте позже.');
        }
    }
}

/**
 * Показывает заявки пользователя
 */
async function showUserTickets(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
        // Получаем пользователя
        const userResponse = await getUserOrCreate(
            userId.toString(),
            ctx.from?.first_name || 'Пользователь'
        );

        if (!userResponse.success || !userResponse.data?.id) {
            return ctx.reply('❌ Сначала зарегистрируйтесь с помощью /start');
        }

        // Получаем заявки пользователя
        const ticketsResponse = await getUserTickets(userResponse.data.id);

        if (ticketsResponse.success && ticketsResponse.data) {
            const tickets = ticketsResponse.data;

            if (tickets.length === 0) {
                return ctx.reply(
                    '📭 У вас пока нет заявок.\n\n' +
                    'Создайте первую заявку командой /new'
                );
            }

            // Группируем заявки по статусу
            const newTickets = tickets.filter(t => t.status === 'NEW');
            const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS');
            const doneTickets = tickets.filter(t => t.status === 'DONE');

            let message = `📊 *Ваши заявки* (всего: ${tickets.length})\n\n`;

            // Новые заявки
            if (newTickets.length > 0) {
                message += `🟢 *Новые (${newTickets.length}):*\n`;
                newTickets.slice(0, 3).forEach((ticket, index) => {
                    message += `${index + 1}. ${ticket.title}\n`;
                });
                if (newTickets.length > 3) {
                    message += `... и еще ${newTickets.length - 3}\n`;
                }
                message += '\n';
            }

            // Заявки в работе
            if (inProgressTickets.length > 0) {
                message += `🟡 *В работе (${inProgressTickets.length}):*\n`;
                inProgressTickets.slice(0, 3).forEach((ticket, index) => {
                    message += `${index + 1}. ${ticket.title}`;
                    if (ticket.comment) {
                        message += `\n   💬 ${ticket.comment.substring(0, 50)}...`;
                    }
                    message += '\n';
                });
                message += '\n';
            }

            // Завершенные заявки
            if (doneTickets.length > 0) {
                message += `✅ *Завершены (${doneTickets.length}):*\n`;
                doneTickets.slice(0, 2).forEach((ticket, index) => {
                    message += `${index + 1}. ${ticket.title}\n`;
                });
            }

            // Добавляем инструкции
            message += '\n---\n';
            message += '📱 *Управление заявками:*\n';
            message += '• Для деталей откройте веб-кабинет /web\n';
            message += '• Создать новую заявку /new\n';
            message += '• Обновить список - отправьте /my\n';

            // Клавиатура с действиями
            const ticketsKeyboard = new InlineKeyboard()
                .text('🔄 Обновить', 'refresh_tickets')
                .text('➕ Новая заявка', 'new_ticket')
                .row()
                .url('🌐 Веб-кабинет', `http://localhost:3000?tgId=${userId}`);

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: ticketsKeyboard,
            });
        } else {
            await ctx.reply(`❌ Ошибка при получении заявок: ${ticketsResponse.error || 'Неизвестная ошибка'}`);
        }
    } catch (error) {
        console.error('Error fetching tickets:', error);
        await ctx.reply('❌ Ошибка при получении заявок.');
    }
}

// ===================== ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ =====================

// Обработка текстовых сообщений
bot.on('message:text', async (ctx) => {
    const userId = ctx.from?.id;
    const text = ctx.message.text;

    if (!userId) return;

    const session = userSessions.get(userId);

    // Обработка кнопок главного меню
    if (!session?.creatingTicket) {
        switch (text) {
            case '📝 Создать заявку':
                await startTicketCreation(ctx);
                return;
            case '📋 Мои заявки':
                await showUserTickets(ctx);
                return;
            case '🌐 Веб-кабинет':
                const webUrl = `http://localhost:3000?tgId=${userId}`;
                await ctx.reply(
                    `🌐 Ваш веб-кабинет:\n${webUrl}`,
                    {
                        reply_markup: new InlineKeyboard()
                            .url('Открыть', webUrl)
                    }
                );
                return;
            case '❓ Помощь':
                await ctx.reply(
                    'Выберите действие или используйте команды:\n' +
                    '/new - Создать заявку\n' +
                    '/my - Мои заявки\n' +
                    '/web - Веб-кабинет\n' +
                    '/help - Подробная справка'
                );
                return;
        }
    }

    // Обработка создания заявки
    if (session?.creatingTicket) {
        await handleTicketCreation(ctx, session, text);
    }
});

// ===================== ОБРАБОТКА CALLBACK-ЗАПРОСОВ =====================

// Обработка callback-запросов (нажатие на inline-кнопки)
bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from?.id;

    if (!userId) return;

    try {
        await ctx.answerCallbackQuery(); // Убираем часики

        switch (data) {
            case 'refresh_tickets':
                await showUserTickets(ctx);
                break;
            case 'new_ticket':
                await startTicketCreation(ctx);
                break;
            default:
                await ctx.answerCallbackQuery({ text: 'Действие не распознано' });
        }
    } catch (error) {
        console.error('Error handling callback:', error);
        await ctx.answerCallbackQuery({ text: 'Ошибка при обработке' }).catch(() => {});
    }
});

// ===================== ОБРАБОТКА ОШИБОК =====================

// Обработка ошибок бота
bot.catch((err) => {
    console.error('🤖 Bot error:', err);
});

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
    console.error('⚠️ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

// ===================== ЗАПУСК БОТА =====================

// Функция запуска бота
async function startBot() {
    try {
        // Проверка конфигурации
        console.log('🔧 Конфигурация бота:');
        console.log('• BOT_TOKEN:', BOT_TOKEN ? '✅ Установлен' : '❌ Отсутствует');
        console.log('• API_URL:', API_URL);

        // Запуск бота
        console.log('🚀 Запуск бота...');
        await bot.start();

        console.log('='.repeat(50));
        console.log('✅ Бот успешно запущен!');
        console.log('🤖 Бот готов к работе');
        console.log('📱 Ищите бота в Telegram по username');
        console.log('='.repeat(50));

        // Информация для разработчика
        console.log('\n📋 Команды разработчика:');
        console.log('• Ctrl+C - Остановить бота');
        console.log('• Проверка API: http://localhost:3000/api/tickets');

    } catch (error) {
        console.error('❌ Фатальная ошибка при запуске бота:', error);
        process.exit(1);
    }
}

// Запускаем бота
startBot();