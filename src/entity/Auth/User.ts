import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, Index } from "npm:typeorm@0.3.20";
import type { UserAddress } from "../UserAddress.ts";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
  SELLER = "seller",
  PENDING = "pending"
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  user_id: string; // Changed to string since using UUID generator

  @Column()
  @Index({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ nullable: true })
  phone_number: string;

  
  @Column({ default: false })
  is_verified: boolean;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.PENDING
  })
  user_role: UserRole;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: "timestamp", nullable: true })
  last_login: Date;

  @Column({ nullable: true })
  profile_image: string;

  @Column({ type: "text", nullable: true })
  bio: string;

  @Column({ default: "en" })
  preferred_language: string;

  @Column({ default: "active" })
  account_status: string;

  @Column({ nullable: true })
    resetPasswordToken?: string; // Token for password reset

    @Column({ type: 'timestamp', nullable: true })
    resetPasswordExpiresAt?: Date; // Expiration time for the password reset token

    @Column({ nullable: true })
    verificationToken?: string; // Token for email verification

    @Column({ type: 'timestamp', nullable: true })
    verificationTokenExpiresAt?: Date; // Expiration time for the verification token

   

  @OneToMany("UserAddress", "user")
  addresses: UserAddress[];
}