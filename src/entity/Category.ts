import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, OneToMany } from "npm:typeorm@0.3.20";

@Entity("categories")
export class Category {
    @PrimaryGeneratedColumn()
    category_id: number;

    @Column({ nullable: true })
    @Index()
    name: string;

    @Column({ nullable: true })
    parent_category_id: number;

    @ManyToOne(() => Category, category => category.childCategories, { nullable: true })
    @JoinColumn({ name: "parent_category_id" })
    parentCategory: Category;

    @OneToMany(() => Category, category => category.parentCategory)
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

    // Remove this direct reference to avoid circular dependency
    // We'll use methods in the repository to handle the relationship
}