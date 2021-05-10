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
    timezone: "+02:00",
  }
)

const prisma = new PrismaClient()

async function main() {
  await prisma.$connect()
  await sequelize.authenticate()
  const now = new Date()
  // 1. Test Prisma Client
  // await runPrisma(now)
  // 2. Test Sequelize Client
  await runSequelize(now)
  // 3. Test MySQL Raw Client
  // await runMySQL(now)
}

//
async function runPrisma(now) {
  await prisma.users.create({
    data: {
      created_at: now,
      type: "prisma",
    },
  })
}

// 1. Sequelize sets the default
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

// 2021-05-03 17:56:19.430003	[root] @ localhost [127.0.0.1]	20	1	Connect	root@localhost on prisma_timezones using TCP/IP
// 2021-05-03 17:56:19.430574	root[root] @ localhost [127.0.0.1]	20	1	Query	"SET time_zone = '+00:00'"
// 2021-05-03 15:56:19.431436	root[root] @ localhost [127.0.0.1]	20	1	Query	SELECT 1+1 AS result
// 2021-05-03 15:56:19.442749	root[root] @ localhost [127.0.0.1]	20	1	Prepare	INSERT INTO `users` (`id`,`type`) VALUES (DEFAULT,?)
// 2021-05-03 15:56:19.443646	root[root] @ localhost [127.0.0.1]	20	1	Execute	"INSERT INTO `users` (`id`,`type`) VALUES (DEFAULT,'sequelize')"
// 2021-05-03 17:56:19.471002	root[root] @ localhost []	18	1	Query	BEGIN
// 2021-05-03 17:56:19.475735	root[root] @ localhost []	18	1	Prepare	INSERT INTO `prisma_timezones`.`users` (`updated_at`,`created_at`,`type`) VALUES (?,?,?)
// 2021-05-03 17:56:19.476711	root[root] @ localhost []	18	1	Execute	"INSERT INTO `prisma_timezones`.`users` (`updated_at`,`created_at`,`type`) VALUES ('2021-05-03 15:56:19.469000','2021-05-03 15:56:19.432000','prisma')"
// 2021-05-03 17:56:19.478574	root[root] @ localhost []	18	1	Prepare	SELECT `prisma_timezones`.`users`.`id`, `prisma_timezones`.`users`.`updated_at`, `prisma_timezones`.`users`.`created_at`, `prisma_timezones`.`users`.`type` FROM `prisma_timezones`.`users` WHERE `prisma_timezones`.`users`.`id` = ? LIMIT ? OFFSET ?
// 2021-05-03 17:56:19.478678	root[root] @ localhost []	18	1	Prepare	SELECT `prisma_timezones`.`users`.`id`, `prisma_timezones`.`users`.`updated_at`, `prisma_timezones`.`users`.`created_at`, `prisma_timezones`.`users`.`type` FROM `prisma_timezones`.`users` WHERE `prisma_timezones`.`users`.`id` = ? LIMIT ? OFFSET ?
// 2021-05-03 17:56:19.478707	root[root] @ localhost []	18	1	Execute	SELECT `prisma_timezones`.`users`.`id`, `prisma_timezones`.`users`.`updated_at`, `prisma_timezones`.`users`.`created_at`, `prisma_timezones`.`users`.`type` FROM `prisma_timezones`.`users` WHERE `prisma_timezones`.`users`.`id` = 55 LIMIT 1 OFFSET 0
// 2021-05-03 17:56:19.479035	root[root] @ localhost []	18	1	Query	COMMIT
