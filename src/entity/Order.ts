import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from "npm:typeorm@0.3.20";
import { User } from "./Auth/User.ts";
import { Product } from "./Product.ts";
import { OrderItem } from "./OrderItem.ts";
import { Payment } from "./Payment.ts";
import { OrderStatusHistory } from "./OrderStatusHistory.ts";
@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  order_id: string;

  @Column()
  @Index()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column("decimal", { precision: 10, scale: 2 })
  total_amount: number;

  @Column()
  @Index()
  status: string;

  @CreateDateColumn()
  @Index()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column()
  shipping_address_id: number;

  @Column()
  billing_address_id: number;

  @Column("decimal", { precision: 10, scale: 2 })
  shipping_cost: number;

  @Column("decimal", { precision: 10, scale: 2 })
  tax_amount: number;

  @Column({ nullable: true })
  tracking_number: string;

  @Column()
  @Index()
  payment_status: string;

  @Column()
  currency: string;

  @Column({ nullable: true })
  notes: string;

  @Column()
  source: string;

  @OneToMany(() => OrderStatusHistory, (history) => history.order)
  statusHistory: OrderStatusHistory[];

  // Use string reference for orderItems
  @OneToMany(() => "OrderItem", (orderItem: any) => orderItem.order)
  orderItems: any[];


  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Payment[];
}