// database.ts
import { DataSource } from "npm:typeorm@0.3.20";
import { load } from "https://deno.land/std/dotenv/mod.ts";
import { User } from "./entity/Auth/User.ts";
import { UserAddress } from "./entity/UserAddress.ts";
import { Category } from "./entity/Category.ts";

const env = await load();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env["POSTGRES_HOST"] || "localhost",
  port: Number(env["POSTGRES_PORT"]) || 5432,
  username: env["POSTGRES_USER"],
  password: env["POSTGRES_PASSWORD"],
  database: env["POSTGRES_DB"],
  synchronize: true,
  logging: false,
  entities: [User,UserAddress,Category],
  migrations: [],
  subscribers: [],
});