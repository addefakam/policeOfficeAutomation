import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/officers - Get all officers with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search');
    const department = searchParams.get('department');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { badgeNumber: { contains: search } },
        { rank: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (department) {
      where.department = department;
    }
    if (status) {
      where.status = status;
    }

    const officers = await db.officer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(officers);
  } catch (error) {
    console.error('Error fetching officers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch officers' },
      { status: 500 }
    );
  }
}

// POST /api/officers - Create a new officer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      badgeNumber,
      name,
      rank,
      department,
      phone,
      email,
      status,
    } = body;

    if (!badgeNumber || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: badgeNumber, name' },
        { status: 400 }
      );
    }

    const officer = await db.officer.create({
      data: {
        badgeNumber,
        name,
        rank: rank || 'Officer',
        department: department || 'General Patrol',
        phone,
        email,
        status: status || 'Active',
      },
    });

    return NextResponse.json({ success: true, data: officer }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating officer:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Badge number already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create officer' },
      { status: 500 }
    );
  }
}
