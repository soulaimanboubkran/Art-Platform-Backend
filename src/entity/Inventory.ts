import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, UpdateDateColumn } from "npm:typeorm@0.3.20";

@Entity("inventory")
export class Inventory {
    @PrimaryGeneratedColumn("uuid")
    inventory_id: string;

    @Column()
    @Index()
    product_id: string;

    @ManyToOne("Product", "inventories")
    @JoinColumn({ name: "product_id" })
    product: any; // Use 'any' to avoid import

    @Column()
    quantity: number;

    @Column()
    @Index({ unique: true })
    sku: string;

    @Column({ nullable: true })
    location: string;

    @UpdateDateColumn()
    last_updated: Date;
}