import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn } from "npm:typeorm@0.3.20";
import { Product } from "./Product.ts";
import { User } from "./Auth/User.ts";

@Entity("product_views")
export class ProductView {
    @PrimaryGeneratedColumn("uuid")
    view_id: string;

    @Column()
    @Index()
    product_id: string;

    @ManyToOne(() => Product, product => product.views)
    @JoinColumn({ name: "product_id" })
    product: Product;

    @Column({ nullable: true })
    @Index()
    user_id: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column({ nullable: true })
    session_id: string;

    @CreateDateColumn()
    viewed_at: Date;

    @Column({ nullable: true })
    referrer_url: string;
}
