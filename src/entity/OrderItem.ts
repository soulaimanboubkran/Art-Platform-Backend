import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from "npm:typeorm@0.3.20";
import { Order } from "./Order.ts";
import { Product } from "./Product.ts";
import { Auction } from "./Auction.ts";
import { Bid } from "./Bid.ts";
import { Inventory } from "./Inventory.ts";

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn("uuid")
  order_item_id: string;

  @Column()
  @Index()
  order_id: number;

  // Use string reference instead of direct reference
  @ManyToOne(() => "Order", (order: any) => order.orderItems)
  @JoinColumn({ name: "order_id" })
  order: any;

  @Column()
  @Index()
  product_id: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: "product_id" })
  product: Product;

  // Optional relation to inventory - when product is not an auction
  @Column({ nullable: true })
  @Index({ where: "inventory_id IS NOT NULL" })
  inventory_id: string;

  @ManyToOne(() => Inventory, { nullable: true })
  @JoinColumn({ name: "inventory_id" })
  inventory: Inventory;

  @Column()
  quantity: number;

  @Column("decimal", { precision: 10, scale: 2 })
  price_at_purchase: number;

  @Column("decimal", { precision: 10, scale: 2 })
  subtotal: number;

  @Column({ default: false })
  is_auction_win: boolean;

  @Column({ nullable: true })
  @Index({ where: "bid_id IS NOT NULL" })
  bid_id: number;

  @ManyToOne(() => Bid, { nullable: true })
  @JoinColumn({ name: "bid_id" })
  winningBid: Bid;

  @Column({ default: "pending" })
  status: string;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  tax_amount: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  discount_amount: number;
  
  @CreateDateColumn()
  created_at: Date;
  
  @UpdateDateColumn()
  updated_at: Date;
}