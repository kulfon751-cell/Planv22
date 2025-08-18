import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Zwracamy informację o CSRF - w produkcji będzie obsługiwane przez middleware
    return NextResponse.json({ 
      success: true,
      message: 'CSRF protection active'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get CSRF token' },
      { status: 500 }
    );
  }
}