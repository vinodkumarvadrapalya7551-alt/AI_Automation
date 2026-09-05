import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

// In-memory user storage for demo
let registeredUsers: any[] = [
  {
    id: 'demo-1',
    name: 'Demo Employee',
    email: 'employee@autoledger.com',
    passwordHash: await bcrypt.hash('password', 12),
    role: 'EMPLOYEE',
    department: 'Finance',
  },
  {
    id: 'demo-2',
    name: 'Demo Admin',
    email: 'admin@autoledger.com',
    passwordHash: await bcrypt.hash('password', 12),
    role: 'ADMIN',
    department: 'Management',
  },
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, password, department, role } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = registeredUsers.find(u => u.email === email.toLowerCase())
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = {
      id: uuidv4(),
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
      department: department || 'General',
    }

    registeredUsers.push(user)

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
    console.error('[Register]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
