
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from "npm:typeorm@0.3.20";
import { Order } from "./Order.ts";

import { User } from "./Auth/User.ts";

@Entity("order_status_history")
export class OrderStatusHistory {
  @PrimaryGeneratedColumn("uuid")
  history_id: string;

  @Column()
  @Index()
  order_id: number;

  @ManyToOne(() => "Order", (order: any) => order.orderItems)
  @JoinColumn({ name: "order_id" })
  order: any;

  @Column()
  status: string;

  @Column()
  changed_at: Date;

  @Column()
  changed_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "changed_by_user_id" })
  changedByUser: User;

  @Column({ nullable: true })
  notes: string;
}
