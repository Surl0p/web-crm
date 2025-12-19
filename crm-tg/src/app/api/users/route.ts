import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// POST /api/users
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        if (!body.telegramId) {
            return NextResponse.json(
                { success: false, error: 'telegramId is required' },
                { status: 400 }
            )
        }

        let user = await prisma.user.findUnique({
            where: { telegramId: body.telegramId }
        })

        if (!user) {
            const hashedPassword = await bcrypt.hash(body.telegramId, 10)

            user = await prisma.user.create({
                data: {
                    telegramId: body.telegramId,
                    name: body.name || `User_${body.telegramId.slice(0, 5)}`,
                    email: `${body.telegramId}@telegram.ru`,
                    password: hashedPassword,
                    role: 'USER'
                }
            })
        }

        // Не возвращаем пароль
        const { password, ...userWithoutPassword } = user

        return NextResponse.json({
            success: true,
            data: userWithoutPassword
        })
    } catch (error: any) {
        console.error('Error processing user:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to process user' },
            { status: 500 }
        )
    }
}