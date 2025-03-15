import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from "npm:typeorm@0.3.20";
import type { User } from "./Auth/User.ts";

@Entity("user_addresses")
export class UserAddress {
  @PrimaryGeneratedColumn("uuid")
  address_id: string;

  @Column()
  @Index()
  user_id: string;

  @Column()
  address_type: string;

  @Column()
  street_address: string;

  @Column()
  city: string;

  @Column()
  state_region: string;

  @Column()
  postal_code: string;

  @Column()
  country: string;

  @Column({ default: false })
  is_default: boolean;

  @Column()
  recipient_name: string;

  @Column({ nullable: true })
  phone_number: string;

  @ManyToOne("User", "addresses")
  @JoinColumn({ name: "user_id" })
  user: User;
}