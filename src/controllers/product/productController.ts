import { Request, Response, NextFunction } from 'npm:express';

import { DataSource, Repository, Like, FindOptionsWhere, In } from "npm:typeorm@0.3.20";
import { Product } from "../../entity/Product.ts";
import { ProductImage } from "../../entity/ProductImage.ts";
import { ProductCategory } from "../../entity/ProductCategory.ts";
import { ProductView } from "../../entity/ProductView.ts";
import { Inventory } from "../../entity/Inventory.ts";
import { Auction } from "../../entity/Auction.ts";
import { Bid } from "../../entity/Bid.ts";
import slugify from "npm:slugify@1.6.6";
import { AppDataSource } from '../../database.ts';

interface CreateProductRequest {
  title: string;
  description: string;
  price: number;
  categories?: number[];
  images?: { image_url: string; thumbnail_url?: string; alt_text?: string; display_order?: number }[];
  inventory?: { quantity?: number; sku?: string; location?: string };
  is_auction?: boolean;
  auction?: {
    start_time?: Date;
    end_time?: Date;
    starting_price?: number;
    reserve_price?: number;
    min_bid_increment?: number;
    auto_extend?: boolean;
    auto_extend_minutes?: number;
    deposit_required?: boolean;
    deposit_percentage?: number;
    bid_increments?: { price_from: number; price_to: number; increment_amount: number }[];
  };
}

export class ProductController {

  private productRepository = AppDataSource.getRepository(Product);
  private productCategoryRepository = AppDataSource.getRepository(ProductCategory);
  private productImageRepository = AppDataSource.getRepository(ProductImage);
  private productInventoryRepository = AppDataSource.getRepository(Inventory);
  private productAuctionRepository = AppDataSource.getRepository(Auction);
 
  async createProduct(req: Request<{}, {}, CreateProductRequest>, res: Response, next: NextFunction) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect(); // Connect to the database
  
    let isTransactionActive = false; // Flag to track if the transaction is active
  
    try {
      await queryRunner.startTransaction(); // Start the transaction
      isTransactionActive = true; // Mark the transaction as active
  
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
  
      const { 
        categories = [], 
        images = [], 
        inventory = null, 
        auction = null,
        ...productFields 
      } = req.body;
  
      // Generate slug from title
      const slug = slugify(productFields.title, { lower: true, strict: true });
  
      // Check if slug exists
      const slugExists = await queryRunner.manager.findOne(Product, { where: { slug } });
      if (slugExists) {
        // Add random suffix if slug already exists
        const randomSuffix = Math.floor(Math.random() * 10000);
        productFields.slug = `${slug}-${randomSuffix}`;
      } else {
        productFields.slug = slug;
      }
  
      // Create product
      const product = this.productRepository.create({
        ...productFields,
        seller_id: userId
      });
  
      const savedProduct = await queryRunner.manager.save(product);
  
      // Save product categories if provided
      if (categories.length > 0) {
        const productCategories = categories.map((categoryId: number) => {
          const productCategory = new ProductCategory();
          productCategory.product_id = savedProduct.product_id; // Set product_id
          productCategory.category_id = categoryId; // Set category_id
          return productCategory;
        });
  
        await queryRunner.manager.save(productCategories); // Save the join table entries
      }
  
      // Save product images if provided
      // Save product images if provided
if (images.length > 0) {
  const productImages = images.map((image, index) => {
    const productImage = new ProductImage();
    productImage.image_url = image.image_url;
    productImage.thumbnail_url = image.thumbnail_url || image.image_url;
    productImage.alt_text = image.alt_text || savedProduct.title;
    productImage.display_order = image.display_order !== undefined ? image.display_order : index;
    productImage.product = savedProduct; // Associate the image with the product
    return productImage;
  });

  await queryRunner.manager.save(productImages);
}
  
      // Save inventory if provided
      if (inventory) {
        const productInventory = new Inventory();
        productInventory.quantity = inventory.quantity || 1;
        productInventory.sku = inventory.sku || `${savedProduct.slug}-${Date.now()}`;
        productInventory.location = inventory.location || null;
        productInventory.product = savedProduct; // Associate the inventory with the product
      
        await queryRunner.manager.save(productInventory);
      }
      // Save auction details if product is an auction
      // Save auction details if product is an auction
if (productFields.is_auction && auction) {
  const productAuction = new Auction();
  productAuction.start_time = auction.start_time || new Date();
  productAuction.end_time = productFields.auction_end_time;
  productAuction.starting_price = auction.starting_price || productFields.base_price;
  productAuction.reserve_price = productFields.reserve_price || null;
  productAuction.min_bid_increment = productFields.min_bid_increment;
  productAuction.auto_extend = auction.auto_extend || false;
  productAuction.auto_extend_minutes = auction.auto_extend_minutes || 5;
  productAuction.deposit_required = auction.deposit_required || false;
  productAuction.deposit_percentage = auction.deposit_percentage || 0;
  productAuction.product = savedProduct; // Associate the auction with the product

  const savedAuction = await queryRunner.manager.save(productAuction);

  
}
  
      // Commit the transaction
      await queryRunner.commitTransaction();
      isTransactionActive = false; // Mark the transaction as inactive
  
      // Load the product with relationships to return
      const productWithRelations = await this.productRepository.findOne({
        where: { product_id: savedProduct.product_id },
        relations: ['categories', 'images', 'inventories', 'auctions', ]
      });
  
      return res.status(201).json(productWithRelations);
  
    } catch (error) {
      console.error("Registration error:", error);
  
      // Rollback the transaction only if it is still active
      if (isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
  
      next(error);
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }


  async getAllProducts(req: Request, res: Response, next: NextFunction) {
    const { page = 1, limit = 10, search, category, minPrice, maxPrice } = req.query;

    try {
        const skip = (Number(page) - 1) * Number(limit); // Calculate skip value
        const take = Number(limit); // Number of records per page

        // Define the base query
        const where: FindOptionsWhere<Product> = {};

        // Add filters if provided
        if (search) {
            where.title = Like(`%${search}%`); // Search by title
        }
        if (category) {
            where.categories = { category_id: In([category]) }; // Filter by category
        }
        if (minPrice) {
            where.base_price = MoreThanOrEqual(Number(minPrice)); // Filter by minimum price
        }
        if (maxPrice) {
            where.base_price = LessThanOrEqual(Number(maxPrice)); // Filter by maximum price
        }

        const [products, total] = await this.productRepository.findAndCount({
            where,
            skip,
            take,
            relations: ["categories", "images"],
        });

        if (products.length === 0) {
            return res.status(404).json({ message: "No products found" });
        }

        return res.status(200).json({
            products,
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
        });
    } catch (error) {
        console.error("Error fetching all products:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async getProductById(req: Request, res: Response, next: NextFunction) {
  const { product_id } = req.params;
  const { include } = req.query; // Optional: include relations (e.g., "categories,images")

  try {
      const relations = include ? include.split(",") : []; // Parse relations to include

      const product = await this.productRepository.findOne({
          where: { product_id },
          relations, // Load specified relations
      });

      if (!product) {
          return res.status(404).json({ message: "Product not found" });
      }

      return res.status(200).json({ product });
  } catch (error) {
      console.error("Error fetching product by ID:", error);
      return res.status(500).json({ message: "Internal server error" });
  }
}

async getProductsBySellerId(req: Request, res: Response, next: NextFunction) {
  const { seller_id } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
      const skip = (Number(page) - 1) * Number(limit); // Calculate skip value
      const take = Number(limit); // Number of records per page

      const [products, total] = await this.productRepository.findAndCount({
          where: { seller_id },
          skip,
          take,
      });

      if (products.length === 0) {
          return res.status(404).json({ message: "No products found for this seller" });
      }

      return res.status(200).json({
          products,
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
      });
  } catch (error) {
      console.error("Error fetching products by seller ID:", error);
      return res.status(500).json({ message: "Internal server error" });
  }
}

async getProductsByCategory(req: Request, res: Response, next: NextFunction) {
  const { category_id } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
      const skip = (Number(page) - 1) * Number(limit); // Calculate skip value
      const take = Number(limit); // Number of records per page

      const [products, total] = await this.productRepository.findAndCount({
          where: { categories: { category_id } },
          skip,
          take,
      });

      if (products.length === 0) {
          return res.status(404).json({ message: "No products found for this category" });
      }

      return res.status(200).json({
          products,
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
      });
  } catch (error) {
      console.error("Error fetching products by category:", error);
      return res.status(500).json({ message: "Internal server error" });
  }
}
}