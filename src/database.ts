// database.ts
import { DataSource } from "npm:typeorm@0.3.20";
import { load } from "https://deno.land/std/dotenv/mod.ts";
import { User } from "./entity/Auth/User.ts";
import { UserAddress } from "./entity/UserAddress.ts";
import { Category } from "./entity/Category.ts";
import { Product } from "./entity/Product.ts";
import { Inventory } from "./entity/Inventory.ts";
import { ProductImage } from "./entity/ProductImage.ts";
import { ProductView } from "./entity/ProductView.ts";
import { ProductCategory } from "./entity/ProductCategory.ts";
import { Auction } from "./entity/Auction.ts";
import { Bid } from "./entity/Bid.ts";
import { Order } from "./entity/Order.ts";
import { OrderItem } from "./entity/OrderItem.ts";
import { OrderStatusHistory } from "./entity/OrderStatusHistory.ts";
import { Payment } from "./entity/Payment.ts";
import { PaymentMethod } from "./entity/PaymentMethod.ts";
const env = await load();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env["POSTGRES_HOST"] || "localhost",
  port: Number(env["POSTGRES_PORT"]) || 5432,
  username: env["POSTGRES_USER"],
  password: env["POSTGRES_PASSWORD"],
  database: env["POSTGRES_DB"],
  synchronize: true, // Set to false in production
  logging: true,
  entities: [
    User,
    UserAddress,
    Category,
    Product,
    Inventory,
    ProductImage,
    ProductView,
    ProductCategory,
    Auction,
    Bid,
    Order,
    OrderItem,
    OrderStatusHistory,
    Payment,
    PaymentMethod
  ],
  migrations: [],
  subscribers: [],
});

