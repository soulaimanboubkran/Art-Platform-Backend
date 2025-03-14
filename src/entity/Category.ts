import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Unique } from "npm:typeorm@0.3.20";

@Entity("categories")
@Unique(["slug"])
export class Category {
  @PrimaryGeneratedColumn()
  category_id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @ManyToOne(() => Category, (category) => category.children, { nullable: true })
  parent_category?: Category;

  @OneToMany(() => Category, (category) => category.parent_category)
  children?: Category[];

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  icon?: string;

  @Column({ type: "int", default: 0 })
  display_order!: number;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @Column({ type: "varchar", length: 255 })
  slug!: string;
}
