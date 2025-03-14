import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, UpdateDateColumn } from "npm:typeorm@0.3.20";
import { Product } from "./Product.ts";

@Entity("inventory")
export class Inventory {
    @PrimaryGeneratedColumn()
    inventory_id: number;

    @Column()
    @Index()
    product_id: number;

    @ManyToOne(() => Product, product => product.inventories)
    @JoinColumn({ name: "product_id" })
    product: Product;

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