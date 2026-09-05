let prisma: any

if (process.env.NODE_ENV === 'production') {
  try {
    const { PrismaClient } = require('@prisma/client')
    prisma = new PrismaClient({
      log: ['error'],
    })
  } catch (error) {
    console.error('Failed to initialize Prisma in production:', error)
    prisma = null
  }
} else {
  if (!global.prisma) {
    try {
      const { PrismaClient } = require('@prisma/client')
      global.prisma = new PrismaClient({
        log: ['error'],
      })
    } catch (error) {
      console.error('Failed to initialize Prisma in development:', error)
      global.prisma = null
    }
  }
  prisma = global.prisma
}

export { prisma }
