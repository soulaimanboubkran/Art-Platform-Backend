import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, OneToMany, ManyToMany } from "npm:typeorm@0.3.20";
import { Product } from "./Product.ts"; // Import the Product entity

@Entity("categories")
export class Category {
  @PrimaryGeneratedColumn()
  category_id: number;

  @Column({ nullable: true })
  @Index()
  name: string;

  @Column({ nullable: true })
  parent_category_id: number;

  @ManyToOne(() => Category, (category) => category.childCategories, { nullable: true })
  @JoinColumn({ name: "parent_category_id" })
  parentCategory: Category;

  @OneToMany(() => Category, (category) => category.parentCategory)
  childCategories: Category[];

  @Column("text", { nullable: true })
  description: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ default: 0 })
  display_order: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  @Index({ unique: true })
  slug: string;

  // Define the many-to-many relationship with Product
  @ManyToMany(() => Product, (product) => product.categories)
  products: Product[]; // Add this property
}