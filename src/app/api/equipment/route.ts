import { db } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/equipment - Get all equipment with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;
    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category');
    const condition = searchParams.get('condition');

    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }
    if (condition) {
      where.condition = condition;
    }

    const equipment = await db.equipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

// POST /api/equipment - Create equipment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      itemCode,
      name,
      category,
      quantity,
      availableQty,
      condition,
      storageLocation,
      lastChecked,
    } = body;

    if (!itemCode || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: itemCode, name' },
        { status: 400 }
      );
    }

    const equipment = await db.equipment.create({
      data: {
        itemCode,
        name,
        category: category || 'Communication',
        quantity: quantity || 1,
        availableQty: availableQty || 1,
        condition: condition || 'Good',
        storageLocation,
        lastChecked: lastChecked ? new Date(lastChecked) : undefined,
      },
    });

    return NextResponse.json({ success: true, data: equipment }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating equipment:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Item code already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create equipment' },
      { status: 500 }
    );
  }
}

// PUT /api/equipment - Update equipment (accept { id, ...fields })
export async function PUT(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;
    const body = await request.json();

    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const equipment = await db.equipment.findUnique({ where: { id } });
    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    const updated = await db.equipment.update({
      where: { id },
      data: {
        ...(fields.itemCode !== undefined && { itemCode: fields.itemCode }),
        ...(fields.name !== undefined && { name: fields.name }),
        ...(fields.category !== undefined && { category: fields.category }),
        ...(fields.quantity !== undefined && { quantity: fields.quantity }),
        ...(fields.availableQty !== undefined && { availableQty: fields.availableQty }),
        ...(fields.condition !== undefined && { condition: fields.condition }),
        ...(fields.storageLocation !== undefined && { storageLocation: fields.storageLocation }),
        ...(fields.lastChecked !== undefined && {
          lastChecked: fields.lastChecked ? new Date(fields.lastChecked) : null,
        }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('Error updating equipment:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Item code already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update equipment' },
      { status: 500 }
    );
  }
}

// DELETE /api/equipment - Delete equipment (accept { id })
export async function DELETE(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;
    const body = await request.json();

    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const equipment = await db.equipment.findUnique({ where: { id } });
    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    await db.equipment.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Error deleting equipment:', error);
    return NextResponse.json(
      { error: 'Failed to delete equipment' },
      { status: 500 }
    );
  }
}
