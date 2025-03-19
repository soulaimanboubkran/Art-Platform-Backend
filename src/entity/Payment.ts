import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn } from "npm:typeorm@0.3.20";
import { Order } from "./Order.ts";
import { User } from "./Auth/User.ts";


@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  payment_id: string;

  @Column()
  @Index()
  order_id: string;

  @ManyToOne(() => "Order", (order: any) => order.orderItems)
  @JoinColumn({ name: "order_id" })
  order: any;

  @Column()
  @Index()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column("decimal", { precision: 10, scale: 2 })
  amount: number;

  @Column()
  payment_method: string;

  @Column()
  @Index({ unique: true })
  transaction_id: string;

  @Column()
  @Index()
  payment_date: Date;

  @Column()
  @Index()
  status: string;

  @Column()
  is_deposit: boolean;

  @Column({ nullable: true })
  @Index({ where: "related_bid_id IS NOT NULL" })
  related_bid_id: number;

  @Column()
  currency: string;

  @Column("text")
  payment_details: string;

  @Column()
  payment_gateway: string;

  @Column("decimal", { precision: 10, scale: 2 })
  fee_amount: number;
}
