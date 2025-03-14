import { In } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Category } from '../entity/Category/Category';
import { Core } from '../entity/Core/Core';
import coreCategoriesData from './cores_and_categories.json';

const requiredCores: { id: string, name: string }[] = coreCategoriesData.cores;
const requiredCategories: { id: string, name: string, cores: string[] }[] = coreCategoriesData.categories;

export async function ensureCoresAndCategories() {
    const coreRepository = AppDataSource.getRepository(Core);
    const categoryRepository = AppDataSource.getRepository(Category);

    // Ensure Cores
    const existingCores = await coreRepository.findBy({ id: In(requiredCores.map(core => core.id)) });
    const existingCoreIds = existingCores.map(core => core.id);

    const newCores = requiredCores.filter(core => !existingCoreIds.includes(core.id));
    if (newCores.length > 0) {
        await coreRepository.save(newCores.map(coreData => {
            const core = new Core();
            core.id = coreData.id;
            core.name = coreData.name;
            return core;
        }));
    }

    // Ensure Categories and establish relationships
    const existingCategories = await categoryRepository.find({ relations: ["cores"] });
    const existingCategoryIds = existingCategories.map(cat => cat.id);

    const newCategories = requiredCategories.filter(cat => !existingCategoryIds.includes(cat.id));

    for (const categoryData of newCategories) {
        const category = new Category();
        category.id = categoryData.id;
        category.name = categoryData.name;

        // Find and set associated cores
        const cores = await coreRepository.findBy({ id: In(categoryData.cores) });
        category.cores = cores;

        // Save the category and automatically handle many-to-many relationships
        await categoryRepository.save(category);
    }
}
