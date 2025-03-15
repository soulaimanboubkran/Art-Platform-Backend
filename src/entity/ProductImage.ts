import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from "npm:typeorm@0.3.20";
import type { Product } from "./Product.ts";

@Entity("product_images")
export class ProductImage {
  @PrimaryGeneratedColumn("uuid")
  image_id: string;

  @Column()
  @Index()
  product_id: string;

  // Use a proper forward reference function
  @ManyToOne("Product", "images", { onDelete: "CASCADE" })
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