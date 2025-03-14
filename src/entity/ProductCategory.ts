import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Index } from "npm:typeorm@0.3.20";
import { Product } from "./Product.ts";
import { Category } from "./Category.ts";

@Entity("product_categories")
export class ProductCategory {
    @PrimaryColumn()
    @Index()
    product_id: number;

    @PrimaryColumn()
    @Index()
    category_id: number;

    @ManyToOne(() => Product)
    @JoinColumn({ name: "product_id" })
    product: Product;

    @ManyToOne(() => Category)
    @JoinColumn({ name: "category_id" })
    category: Category;
}