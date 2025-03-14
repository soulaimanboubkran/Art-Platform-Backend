import { AppDataSource } from "../database.ts";
import { Category } from "../entity/Category.ts";

const seedCategories = async () => {
  await AppDataSource.initialize();

  const categories = [
    { name: "Technology", description: "All about tech", slug: "technology", display_order: 1, is_active: true },
    { name: "Art", description: "Creative works", slug: "art", display_order: 2, is_active: true },
    { name: "Books", description: "Book collections", slug: "books", display_order: 3, is_active: true },
  ];

  const categoryRepo = AppDataSource.getRepository(Category);
  
  for (const cat of categories) {
    const existing = await categoryRepo.findOneBy({ slug: cat.slug });
    if (!existing) {
      const newCategory = categoryRepo.create(cat);
      await categoryRepo.save(newCategory);
    }
  }

  console.log("Categories seeded successfully!");
  await AppDataSource.destroy();
};

seedCategories().catch((err) => console.error("Error seeding categories:", err));