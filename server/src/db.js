import pg from 'pg'

// Connexion à PostgreSQL :
//  - en production, DATABASE_URL (adresse fournie par l'hébergeur, ex. Neon : ...?sslmode=require)
//  - en local, les variables PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD du fichier .env
export const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : new pg.Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
    })
