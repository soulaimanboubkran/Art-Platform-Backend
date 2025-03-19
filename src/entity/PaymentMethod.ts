import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from "npm:typeorm@0.3.20";
import { User } from "./Auth/User.ts";




@Entity("payment_methods")
export class PaymentMethod {
  @PrimaryGeneratedColumn("uuid")
  payment_method_id: string;

  @Column()
  @Index()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column()
  payment_type: string;

  @Column({ nullable: true })
  card_last_four: string;

  @Column({ nullable: true })
  card_brand: string;

  @Column({ nullable: true })
  expiration_date: Date;

  @Column()
  is_default: boolean;

  @Column()
  billing_address_id: string;

  @Column({ nullable: true })
  payment_token: string;

  @CreateDateColumn()
  created_at: Date;
}