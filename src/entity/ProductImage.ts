import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from "npm:typeorm@0.3.20";
import { Product } from "./Product.ts";

@Entity("product_images")
export class ProductImage {
    @PrimaryGeneratedColumn()
    image_id: number;

    @Column()
    @Index()
    product_id: number;

    @ManyToOne(() => Product, product => product.images)
    @JoinColumn({ name: "product_id" })
    product: Product;

    @Column()
    image_url: string;

    @Column()
    thumbnail_url: string;

    @Column({ default: 0 })
    display_order: number;

    @CreateDateColumn()
    uploaded_at: Date;

    @Column({ nullable: true })
    alt_text: string;
}