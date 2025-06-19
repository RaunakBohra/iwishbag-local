export interface AmazonProductReview {
  stars: number;
  date: string;
  verified_purchase: boolean;
  manufacturer_replied: boolean;
  username: string;
  user_url?: string;
  title: string;
  review: string;
  review_url?: string;
  total_found_helpful?: number;
  images: string[];
  variation: Record<string, any>;
}

export interface AmazonProductInformation {
  product_dimensions?: string;
  item_model_number?: string;
  date_first_available?: string;
  manufacturer?: string;
  asin: string;
  country_of_origin?: string;
  best_sellers_rank?: string[];
  customer_reviews: {
    ratings_count: number;
    stars: number;
  };
}

export interface AmazonProduct {
  name: string;
  product_information: AmazonProductInformation;
  brand: string;
  brand_url?: string;
  full_description: string;
  pricing: string;
  list_price?: string;
  shipping_price?: string;
  shipping_time?: string;
  shipping_condition?: string;
  shipping_details_url?: string;
  availability_status: string;
  is_coupon_exists: boolean;
  images: string[];
  product_category: string;
  average_rating: number;
  feature_bullets: string[];
  total_reviews: number;
  model?: string;
  ships_from?: string;
  sold_by?: string;
  aplus_present?: boolean;
  total_ratings: number;
  reviews: AmazonProductReview[];
  
  // Rating distribution
  five_star_percentage?: number;
  four_star_percentage?: number;
  three_star_percentage?: number;
  two_star_percentage?: number;
  one_star_percentage?: number;
} 