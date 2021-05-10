# Timezone Reproduction

- MySQL: https://github.com/prisma/prisma/issues/5051
- Postgres: https://github.com/prisma/prisma/issues/6384

## 1. Setting up MySQL on a Mac locally using Homebrew

1. `brew install mysql`
2. `brew services start mysql`
3. Adjust timezone configuration to for example `+02:00`.

   To set this up, add default-time-zone to your MySQL config. Mine was in: `/usr/local/etc/my.cnf`

   ```
   [mysqld]
   # Only allow connections from localhost
   bind-address = 127.0.0.1
   mysqlx-bind-address = 127.0.0.1
   default-time-zone = "+02:00"
   ```

4. `brew services restart mysql`

## 2. Configure application and setup database

1. `npm install`
2. Adjust `.env`

   For example:

   ```
   DATABASE_URL="mysql://root@127.0.0.1:3306/prisma_timezones?sslmode=disable"
   ```

3. Run `npx prisma db push`

## 3. Run Script

1. `node index.js`

This will create an insert using:

1. Prisma
2. Sequelize
3. MySQL2 client

## 4. Observe in TablePlus

I got:

| id  | updated_at          | created_at          | type      |
| --- | ------------------- | ------------------- | --------- |
| 72  | 2021-05-10 13:02:12 | 2021-05-10 13:02:12 | prisma    |
| 73  | 2021-05-10 13:02:11 | 2021-05-10 13:02:11 | sequelize |
| 74  | 2021-05-10 15:02:11 | 2021-05-10 15:02:11 | raw       |

### Time of writing:

- Berlin: 15:02:11
- UTC: 13:02:11

Notice how the raw query is 2 hours off from sequelize and prisma.

### Takeaways

- Prisma always writes times as UTC, even for fields that aren't explicitly inserted but have @default(now) in the schema
- Sequelize will also insert as UTC by default
- If you're mixing Prisma/Sequelize with a raw client and you're not careful, you're in for a bad time.

### Question I had when running this:

- How does Sequelize also insert as UTC despite the database being configured as `+02:00`?

## 5. Debug Raw MySQL

To answer the question above, you can configure your MySQL client to log queries to a special table.

1. Turn on logging

   ```sql
   SET global general_log = 1;
   SET global log_output = 'table';
   ```

2. `node index.js`
3. `SELECT event_time, thread_id, command_type, argument FROM mysql.general_log;`

   For raw SQL you'll see:

   | event_time                 | thread_id | command_type | argument                                                   |
   | -------------------------- | --------- | ------------ | ---------------------------------------------------------- |
   | 2021-05-10 15:25:50.389552 | 44        | Connect      | root@localhost on prisma_timezones using TCP/IP            |
   | 2021-05-10 15:25:50.390260 | 44        | Query        | insert into users (created_at, type) values (now(), 'raw') |
   | 2021-05-10 15:25:50.391413 | 44        | Quit         |                                                            |

   For Sequelize you'll see:

   | event_time                 | thread_id | command_type | argument                                                                                          |
   | -------------------------- | --------- | ------------ | ------------------------------------------------------------------------------------------------- |
   | 2021-05-10 15:23:53.038119 | 39        | Connect      | root@localhost on prisma_timezones using TCP/IP                                                   |
   | 2021-05-10 15:23:53.038504 | 39        | Query        | SET time_zone = '+00:00'                                                                          |
   | 2021-05-10 13:23:53.039057 | 39        | Query        | SELECT 1+1 AS result                                                                              |
   | 2021-05-10 13:23:53.050192 | 39        | Prepare      | INSERT INTO `users` (`id`,`created_at`,`type`) VALUES (DEFAULT,?,?)                               |
   | 2021-05-10 13:23:53.051063 | 39        | Execute      | INSERT INTO `users` (`id`,`created_at`,`type`) VALUES (DEFAULT,'2021-05-10 13:23:53','sequelize') |
   | 2021-05-10 13:23:53.052855 | 39        | Quit         |                                                                                                   |

   For Prisma you'll see:

   | event_time                 | thread_id | command_type | argument                                                                                                                                                                                                                                                |
   | -------------------------- | --------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | 2021-05-10 15:26:23.200422 | 46        | Query        | BEGIN                                                                                                                                                                                                                                                   |
   | 2021-05-10 15:26:23.200853 | 46        | Prepare      | INSERT INTO `prisma_timezones`.`users` (`updated_at`,`created_at`,`type`) VALUES (?,?,?)                                                                                                                                                                |
   | 2021-05-10 15:26:23.200963 | 46        | Execute      | INSERT INTO `prisma_timezones`.`users` (`updated_at`,`created_at`,`type`) VALUES ('2021-05-10 13:26:23.200000','2021-05-10 13:26:23.188000','prisma')                                                                                                   |
   | 2021-05-10 15:26:23.201508 | 46        | Prepare      | SELECT `prisma_timezones`.`users`.`id`, `prisma_timezones`.`users`.`updated_at`, `prisma_timezones`.`users`.`created_at`, `prisma_timezones`.`users`.`type` FROM `prisma_timezones`.`users` WHERE `prisma_timezones`.`users`.`id` = ? LIMIT ? OFFSET ?  |
   | 2021-05-10 15:26:23.201642 | 46        | Prepare      | SELECT `prisma_timezones`.`users`.`id`, `prisma_timezones`.`users`.`updated_at`, `prisma_timezones`.`users`.`created_at`, `prisma_timezones`.`users`.`type` FROM `prisma_timezones`.`users` WHERE `prisma_timezones`.`users`.`id` = ? LIMIT ? OFFSET ?  |
   | 2021-05-10 15:26:23.201674 | 46        | Execute      | SELECT `prisma_timezones`.`users`.`id`, `prisma_timezones`.`users`.`updated_at`, `prisma_timezones`.`users`.`created_at`, `prisma_timezones`.`users`.`type` FROM `prisma_timezones`.`users` WHERE `prisma_timezones`.`users`.`id` = 85 LIMIT 1 OFFSET 0 |
   | 2021-05-10 15:26:23.201978 | 46        | Query        | COMMIT                                                                                                                                                                                                                                                  |

### Takeaways

- With Sequelize, you can adjust the timezone (see commented out code). This will alter the `SET TIMEZONE <offset>` query that happens when you first connect.

  | event_time                 | thread_id | command_type | argument                                                                                          |
  | -------------------------- | --------- | ------------ | ------------------------------------------------------------------------------------------------- |
  | 2021-05-10 15:30:27.138476 | 52        | Connect      | root@localhost on prisma_timezones using TCP/IP                                                   |
  | 2021-05-10 15:30:27.138968 | 52        | Query        | SET time_zone = '+02:00'                                                                          |
  | 2021-05-10 15:30:27.139619 | 52        | Query        | SELECT 1+1 AS result                                                                              |
  | 2021-05-10 15:30:27.152752 | 52        | Prepare      | INSERT INTO `users` (`id`,`created_at`,`type`) VALUES (DEFAULT,?,?)                               |
  | 2021-05-10 15:30:27.153755 | 52        | Execute      | INSERT INTO `users` (`id`,`created_at`,`type`) VALUES (DEFAULT,'2021-05-10 15:30:27','sequelize') |
  | 2021-05-10 15:30:27.156094 | 52        | Quit         |                                                                                                   |
