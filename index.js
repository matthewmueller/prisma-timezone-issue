import Prisma from "@prisma/client"
import mysql from "mysql2/promise"
import Sequelize from "sequelize"
const { PrismaClient } = Prisma

const sequelize = new Sequelize.Sequelize(
  `mysql://root@127.0.0.1:3306/prisma_timezones`,
  {
    define: {
      timestamps: false,
    },
    logging: false,
    // timezone: "+02:00",
  }
)

const prisma = new PrismaClient()

async function main() {
  await prisma.$connect()
  await sequelize.authenticate()
  const now = new Date()
  // 1. Test Prisma Client
  await runPrisma(now)
  // 2. Test Sequelize Client
  await runSequelize(now)
  // 3. Test MySQL Raw Client
  await runMySQL(now)
}

// 1. Test Prisma Client
async function runPrisma(now) {
  await prisma.users.create({
    data: {
      created_at: now,
      type: "prisma",
    },
  })
}

// 2. Test Sequelize Client
async function runSequelize(now) {
  const User = sequelize.define("users", {
    created_at: Sequelize.DataTypes.DATE,
    type: Sequelize.DataTypes.TEXT,
  })
  const user = User.build({
    created_at: now,
    type: "sequelize",
  })
  await user.save()
}

// 3. Test MySQL Raw Client
async function runMySQL(now) {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    database: "prisma_timezones",
  })
  await conn.query(`insert into users (created_at, type) values (now(), 'raw')`)
  await conn.end()
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect()
    sequelize.close()
  })
