import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Status, Priority } from '@prisma/client'

const prisma = new PrismaClient()

interface Params {
    params: { id: string }
}

// PATCH /api/tickets/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const { id } = params
        const body = await request.json()

        const ticket = await prisma.ticket.update({
            where: { id },
            data: {
                status: body.status as Status,
                comment: body.comment,
                priority: body.priority as Priority,
                updatedAt: new Date()
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

        return NextResponse.json({
            success: true,
            data: ticket
        })
    } catch (error: any) {
        console.error('Error updating ticket:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to update ticket' },
            { status: 500 }
        )
    }
}