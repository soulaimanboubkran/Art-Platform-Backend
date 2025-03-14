import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from "npm:typeorm@0.3.20";
import { User } from "./Auth/User.ts";

@Entity("products")
export class Product {
    @PrimaryGeneratedColumn()
    product_id: number;

    @Column()
    @Index()
    seller_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "seller_id" })
    seller: User;

    @Column()
    @Index()
    title: string;

    @Column("text")
    description: string;

    @Column("decimal", { precision: 10, scale: 2 })
    base_price: number;

    @Column()
    is_auction: boolean;

    @Column({ nullable: true })
    auction_end_time: Date;

    @Column("decimal", { precision: 10, scale: 2, nullable: true })
    min_bid_increment: number;

    @Column("decimal", { precision: 10, scale: 2, nullable: true })
    reserve_price: number;

    @Column({ nullable: true })
    year_created: number;

    @Column()
    @Index()
    medium: string;

    @Column()
    @Index()
    style: string;

    @Column("decimal", { precision: 10, scale: 2, nullable: true })
    width: number;

    @Column("decimal", { precision: 10, scale: 2, nullable: true })
    height: number;

    @Column("decimal", { precision: 10, scale: 2, nullable: true })
    depth: number;

    @Column({ nullable: true })
    dimensions_unit: string;

    @Column()
    @Index()
    condition: string;

    @Column()
    is_original: boolean;

    @Column()
    is_framed: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column({ default: true })
    is_active: boolean;

    @Column({ default: 0 })
    view_count: number;

    @Column({ default: 0 })
    favorite_count: number;

    @Column("text", { nullable: true })
    keywords: string;

    @Column()
    @Index({ unique: true })
    slug: string;
}