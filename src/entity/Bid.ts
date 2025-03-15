import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "npm:typeorm@0.3.20";
import { Auction } from "./Auction.ts";
import { Product } from "./Product.ts";
import { User } from "./Auth/User.ts";

@Entity("bids")
export class Bid {
    @PrimaryGeneratedColumn("uuid")
    bid_id: string;

    @Column()
    @Index()
    auction_id: string;

    @ManyToOne(() => Auction)
    @JoinColumn({ name: "auction_id" })
    auction: Auction;

    @Column()
    @Index()
    product_id: string;

    @ManyToOne(() => Product)
    @JoinColumn({ name: "product_id" })
    product: Product;

    @Column()
    @Index()
    user_id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column("decimal", { precision: 10, scale: 2 })
    @Index()
    amount: number;

    @CreateDateColumn()
    @Index()
    bid_time: Date;

    @Column({ default: false })
    is_winning: boolean;

    @Column({ default: false })
    is_auto_bid: boolean;

    @Column("decimal", { precision: 10, scale: 2, nullable: true })
    max_auto_bid_amount: number;

    @Column({ nullable: true })
    ip_address: string;

    @Column({ nullable: true })
    device_info: string;

    @Column({ default: false })
    outbid_notified: boolean;
}