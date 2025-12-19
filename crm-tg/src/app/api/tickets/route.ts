import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Status, Priority, Channel } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/tickets
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')
        const status = searchParams.get('status') as Status | null

        const where: any = {}
        if (userId) where.userId = userId
        if (status) where.status = status

        const tickets = await prisma.ticket.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        telegramId: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({
            success: true,
            data: tickets
        })
    } catch (error: any) {
        console.error('Error fetching tickets:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch tickets' },
            { status: 500 }
        )
    }
}

// POST /api/tickets
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        if (!body.title || !body.description || !body.userId) {
            return NextResponse.json(
                { success: false, error: 'Title, description and userId are required' },
                { status: 400 }
            )
        }

        const ticket = await prisma.ticket.create({
            data: {
                title: body.title,
                description: body.description,
                userId: body.userId,
                channel: (body.channel as Channel) || 'WEB',
                priority: (body.priority as Priority) || 'MEDIUM',
                status: 'NEW'
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })

        return NextResponse.json(
            { success: true, data: ticket },
            { status: 201 }
        )
    } catch (error: any) {
        console.error('Error creating ticket:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to create ticket' },
            { status: 500 }
        )
    }
}