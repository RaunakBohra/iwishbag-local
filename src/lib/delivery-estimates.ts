import { addDays, addBusinessDays, format, isWeekend } from 'date-fns';

// Types for delivery estimates
export interface DeliveryOption {
  id: string;
  name: string;
  carrier: string;
  min_days: number;
  max_days: number;
  price: number;
  active: boolean;
}

export interface DeliveryEstimate {
  option: DeliveryOption;
  processing_days: number;
  customs_processing_days: number;
  estimated_delivery_min: Date;
  estimated_delivery_max: Date;
  total_cost: number;
}

export interface DeliveryTimeline {
  phases: DeliveryPhase[];
  totalDays: number;
  estimatedDeliveryDate: Date;
}

export interface DeliveryPhase {
  phase: string;
  title: string;
  description: string;
  duration: string;
  days: number;
  icon: string;
  status: 'completed' | 'current' | 'pending';
  estimatedDate?: Date;
}

// Generate unique delivery option ID
export function generateDeliveryOptionId(): string {
  return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate delivery dates from payment date
export function calculateDeliveryDates(
  selectedOption: DeliveryOption,
  processingDays: number = 2,
  customsClearanceDays: number = 3,
  startDate: Date = new Date(),
): DeliveryTimeline {
  const phases: DeliveryPhase[] = [];
  let currentDate = new Date(startDate);
  let totalDays = 0;

  // Phase 1: Order Processing
  const processingEndDate = addBusinessDays(currentDate, processingDays);
  phases.push({
    phase: 'processing',
    title: 'Order Processing',
    description: 'Order verification and preparation',
    duration: `${processingDays} business days`,
    days: processingDays,
    icon: 'package',
    status: 'current',
    estimatedDate: processingEndDate,
  });
  currentDate = processingEndDate;
  totalDays += processingDays;

  // Phase 2: International Shipping
  const shippingDays = Math.ceil((selectedOption.min_days + selectedOption.max_days) / 2);
  const shippingEndDate = addBusinessDays(currentDate, shippingDays);
  phases.push({
    phase: 'shipping',
    title: 'International Shipping',
    description: `In transit via ${selectedOption.carrier}`,
    duration: `${selectedOption.min_days}-${selectedOption.max_days} days`,
    days: shippingDays,
    icon: 'plane',
    status: 'pending',
    estimatedDate: shippingEndDate,
  });
  currentDate = shippingEndDate;
  totalDays += shippingDays;

  // Phase 3: Customs Clearance
  const customsEndDate = addBusinessDays(currentDate, customsClearanceDays);
  phases.push({
    phase: 'customs',
    title: 'Customs Clearance',
    description: 'Documentation review and customs processing',
    duration: `${customsClearanceDays} business days`,
    days: customsClearanceDays,
    icon: 'building2',
    status: 'pending',
    estimatedDate: customsEndDate,
  });
  currentDate = customsEndDate;
  totalDays += customsClearanceDays;

  // Phase 4: Local Delivery
  const localDeliveryDays = 1; // Usually 1 day for local delivery
  const deliveryEndDate = addBusinessDays(currentDate, localDeliveryDays);
  phases.push({
    phase: 'delivery',
    title: 'Local Delivery',
    description: 'Final delivery to your address',
    duration: `${localDeliveryDays} business day`,
    days: localDeliveryDays,
    icon: 'truck',
    status: 'pending',
    estimatedDate: deliveryEndDate,
  });
  totalDays += localDeliveryDays;

  return {
    phases,
    totalDays,
    estimatedDeliveryDate: deliveryEndDate,
  };
}

// Create delivery timeline with phases
export function createDeliveryTimeline(
  estimate: DeliveryEstimate,
  paymentDate: Date,
): DeliveryTimeline[] {
  const dates = calculateDeliveryDates(
    estimate.option,
    estimate.processing_days,
    estimate.customs_processing_days,
    paymentDate,
  );

  return [
    {
      phases: dates.phases,
      totalDays: dates.totalDays,
      estimatedDeliveryDate: dates.estimatedDeliveryDate,
    },
  ];
}

// Calculate total delivery time in business days
export function calculateTotalDeliveryTime(estimate: DeliveryEstimate): number {
  return estimate.processing_days + estimate.option.max_days + estimate.customs_processing_days + 2; // Local delivery
}

// Format delivery estimate for display
export function formatDeliveryEstimate(estimate: DeliveryEstimate): string {
  const totalDays = calculateTotalDeliveryTime(estimate);
  const minDays =
    estimate.processing_days + estimate.option.min_days + estimate.customs_processing_days + 1;
  const maxDays = totalDays;

  if (minDays === maxDays) {
    return `${minDays} business days`;
  }
  return `${minDays}-${maxDays} business days`;
}

// Generate delivery message for customer communication
export function generateDeliveryMessage(
  estimate: DeliveryEstimate,
  paymentDate: Date,
  orderNumber?: string,
): string {
  const timeline = createDeliveryTimeline(estimate, paymentDate);
  const dates = calculateDeliveryDates(
    estimate.option,
    estimate.processing_days,
    estimate.customs_processing_days,
    paymentDate,
  );

  return `Dear Customer,

Thank you for your order${orderNumber ? ` (Order #${orderNumber})` : ''}. Here's your delivery information:

📦 Delivery Method: ${estimate.option.name}
🚚 Carrier: ${estimate.option.carrier}
⏰ Estimated Delivery: ${formatDeliveryEstimate(estimate)}
📅 Expected Delivery: ${format(dates.estimatedDeliveryDate, 'EEEE, MMMM do, yyyy')}

Delivery Timeline:
• Order Processing: ${format(dates.phases[0].estimatedDate, 'MMM do')} - ${format(dates.phases[0].estimatedDate, 'MMM do')}
• International Shipping: ${format(dates.phases[1].estimatedDate, 'MMM do')} - ${format(dates.phases[1].estimatedDate, 'MMM do')}
• Customs Clearance: ${format(dates.phases[2].estimatedDate, 'MMM do')} - ${format(dates.phases[2].estimatedDate, 'MMM do')}
• Local Delivery: ${format(dates.phases[3].estimatedDate, 'MMM do')} - ${format(dates.phases[3].estimatedDate, 'MMM do')}

Please note that delivery times may vary due to customs processing and local conditions.

Best regards,
The WishBag Team`;
}

// Validate delivery option structure
export function validateDeliveryOption(option: unknown): option is DeliveryOption {
  return (
    typeof option === 'object' &&
    typeof option.id === 'string' &&
    typeof option.name === 'string' &&
    typeof option.carrier === 'string' &&
    typeof option.min_days === 'number' &&
    typeof option.max_days === 'number' &&
    typeof option.price === 'number' &&
    typeof option.active === 'boolean' &&
    option.min_days >= 1 &&
    option.max_days >= option.min_days &&
    option.price >= 0
  );
}

// Get active delivery options from shipping route
export function getActiveDeliveryOptions(deliveryOptions: unknown[]): DeliveryOption[] {
  if (!Array.isArray(deliveryOptions)) return [];

  return deliveryOptions
    .filter((option) => validateDeliveryOption(option) && option.active)
    .sort((a, b) => a.min_days - b.min_days);
}

// Calculate delivery estimate for a specific option
export function calculateDeliveryEstimate(
  option: DeliveryOption,
  processingDays: number = 2,
  customsProcessingDays: number = 3,
  paymentDate: Date = new Date(),
): DeliveryEstimate {
  const estimated_delivery_min = addBusinessDays(
    paymentDate,
    processingDays + option.min_days + customsProcessingDays + 1,
  );
  const estimated_delivery_max = addBusinessDays(
    paymentDate,
    processingDays + option.max_days + customsProcessingDays + 2,
  );

  return {
    option,
    processing_days: processingDays,
    customs_processing_days: customsProcessingDays,
    estimated_delivery_min,
    estimated_delivery_max,
    total_cost: option.price,
  };
}
