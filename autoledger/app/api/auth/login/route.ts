import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/auth'

// Demo user for testing - bypassing database
const DEMO_USERS = [
  {
    id: 'demo-1',
    name: 'Demo Employee',
    email: 'employee@autoledger.com',
    passwordHash: '$2a$10$.' + 'a'.repeat(53), // Dummy hash
    role: 'EMPLOYEE',
    department: 'Finance',
  },
  {
    id: 'demo-2',
    name: 'Demo Admin',
    email: 'admin@autoledger.com',
    passwordHash: '$2a$10$.' + 'a'.repeat(53), // Dummy hash
    role: 'ADMIN',
    department: 'Management',
  },
]

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Demo login - accept any password for demo users
    let user = DEMO_USERS.find(u => u.email === email.toLowerCase())
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    })

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
    })
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('[Login]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
