import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,OneToMany,OneToOne, UpdateDateColumn, ManyToOne, JoinColumn, Index, ManyToMany, JoinTable } from "npm:typeorm@0.3.20";
import { User } from "./Auth/User.ts";
import { Category } from "./Category.ts"; // Import the Category entity
import { ProductImage } from "./ProductImage.ts"; // Import the ProductImage entity
import { Inventory } from "./Inventory.ts";
import { Auction } from "./Auction.ts";
@Entity("products")
export class Product {
  @PrimaryGeneratedColumn("uuid")
  product_id: string;

  @Column()
  @Index()
  seller_id: string;

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

  // Define the many-to-many relationship with Category
  @ManyToMany(() => Category, (category) => category.products)
  @JoinTable({
    name: "product_categories",
    joinColumn: {
      name: "product_id",
      referencedColumnName: "product_id",
    },
    inverseJoinColumn: {
      name: "category_id",
      referencedColumnName: "category_id",
    },
  })
  categories: Category[];

  @OneToMany(() => ProductImage, (image) => image.product)
  images: ProductImage[];

  // Fix these relationships
  @OneToMany("Inventory", "product")
  inventories: Inventory[];
  
  @OneToMany("Auction", "product")
  auctions: Auction[];
}