import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from "npm:typeorm@0.3.20";

@Entity("bid_increments")
export class BidIncrement {
    @PrimaryGeneratedColumn("uuid")
    increment_id: string;

    @Column()
    @Index()
    auction_id: string;

    // Use string reference to avoid circular imports
    @ManyToOne("Auction", "bidIncrements")
    @JoinColumn({ name: "auction_id" })
    auction: any; // Using 'any' to avoid importing Auction

    @Column("decimal", { precision: 10, scale: 2 })
    price_from: number;

    @Column("decimal", { precision: 10, scale: 2 })
    price_to: number;

    @Column("decimal", { precision: 10, scale: 2 })
    increment_amount: number;
}