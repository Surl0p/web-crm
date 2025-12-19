import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        if (!body.email || !body.password) {
            return NextResponse.json(
                { success: false, error: 'Email and password are required' },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { email: body.email }
        })

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 401 }
            )
        }

        const isValidPassword = await bcrypt.compare(body.password, user.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { success: false, error: 'Invalid password' },
                { status: 401 }
            )
        }

        if (user.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Access denied. Admin only.' },
                { status: 403 }
            )
        }

        const { password, ...userWithoutPassword } = user

        return NextResponse.json({
            success: true,
            data: {
                user: userWithoutPassword
            }
        })

    } catch (error: any) {
        console.error('Login error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Login failed' },
            { status: 500 }
        )
    }
}