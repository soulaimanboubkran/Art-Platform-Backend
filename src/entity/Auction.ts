import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index , OneToMany} from "npm:typeorm@0.3.20";
import { Product } from "./Product.ts";
import { User } from "./Auth/User.ts";
import { BidIncrement } from "./BidIncrement.ts";

@Entity("auctions")
export class Auction {
    @PrimaryGeneratedColumn("uuid")
    auction_id: string;

    @Column()
    @Index({ unique: true })
    product_id: string;


    @ManyToOne("Product", "auctions")
    @JoinColumn({ name: "product_id" })
    product: any; // Use 'any' to avoid import

    @Column()
    @Index()
    start_time: Date;

    @Column()
    @Index()
    end_time: Date;

    @Column("decimal", { precision: 10, scale: 2 })
    starting_price: number;

    @Column("decimal", { precision: 10, scale: 2, nullable: true })
    reserve_price: number;

    @Column("decimal", { precision: 10, scale: 2, nullable: true })
    current_highest_bid: number;

    @Column({ nullable: true })
    @Index()
    current_highest_bidder: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "current_highest_bidder" })
    highestBidder: User;

    @Column("decimal", { precision: 10, scale: 2 })
    min_bid_increment: number;

    @Column({ default: false })
    deposit_required: boolean;

    @Column("decimal", { precision: 5, scale: 2, default: 0 })
    deposit_percentage: number;

    @Column({ default: true })
    is_active: boolean;

    @Column({ default: false })
    auto_extend: boolean;

    @Column({ default: 5 })
    auto_extend_minutes: number;

    @Column({ default: 0 })
    bid_count: number;

    @Column({ default: false })
    reserve_met: boolean;

    @OneToMany(() => BidIncrement, (bidIncrement) => bidIncrement.auction)
    bidIncrements: BidIncrement[];
}
