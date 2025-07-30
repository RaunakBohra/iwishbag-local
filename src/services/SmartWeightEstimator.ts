
  isWeightReasonable(weight: number, category?: string): boolean {
    if (!category) return weight > 0 && weight < 50; // Basic sanity check
    
    const range = this.getCategoryWeightRange(category);
    return weight >= range.min && weight <= range.max;
  }
}

// Export singleton instance
export const smartWeightEstimator = new SimplifiedSmartWeightEstimator();