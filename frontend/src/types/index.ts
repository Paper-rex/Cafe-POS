export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'WAITER' | 'KITCHEN' | 'CASHIER';
  status: 'PENDING' | 'ACTIVE' | 'DISABLED';
  createdAt?: string;
  branches?: Branch[];
}

export interface Branch {
  id: string;
  name: string;
  createdAt?: string;
}

export interface PosSession {
  id: string;
  openedAt: string;
  closedAt: string | null;
  isActive: boolean;
  totalSales: number;
  branchId?: string;
  openedBy?: { id: string; name: string; email: string };
  branch?: { id: string; name: string };
  _count?: { orders: number };
}

export interface Floor {
  id: string;
  name: string;
  branchId?: string;
  tables: Table[];
}

export interface Table {
  id: string;
  number: number;
  seats: number;
  shape: 'ROUND' | 'SQUARE' | 'RECTANGLE';
  posX: number;
  posY: number;
  isActive: boolean;
  floorId: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  _count?: { products: number };
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  taxPercent: number;
  categoryId: string;
  category?: Category;
  variants: Variant[];
  toppings: Topping[];
}

export interface Variant {
  id: string;
  name: string;
  options: { label: string; extraPrice: number }[];
  productId: string;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
  productId: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  tableId: string;
  waiterId: string;
  sessionId: string;
  branchId?: string;
  items: OrderItem[];
  table?: { id: string; number: number };
  waiter?: { id: string; name: string; email?: string };
  payment?: Payment;
}

export type OrderStatus =
  | 'CREATED' | 'SENT' | 'PENDING' | 'COOKING'
  | 'READY' | 'SERVED' | 'PAYMENT_PENDING' | 'PAID' | 'CANCELLED';

export interface OrderItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  variants: any;
  toppings: any;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  isDone: boolean;
  itemStatus: ItemStatus;
  orderId: string;
  productId: string;
}

export type ItemStatus = 'PENDING' | 'COOKING' | 'READY' | 'SERVED';

export interface Payment {
  id: string;
  method: 'CASH' | 'CARD' | 'UPI';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  amount: number;
  taxTotal?: number;
  amountTendered: number | null;
  change: number | null;
  upiQrData: string | null;
  razorpayId: string | null;
  createdAt: string;
  orderId: string;
  confirmedBy?: { id: string; name: string };
  order?: Order;
}

export interface PaymentConfig {
  id: string;
  cashEnabled: boolean;
  cardEnabled: boolean;
  upiEnabled: boolean;
  upiId: string | null;
  upiName: string | null;
}

export interface DashboardData {
  todayOrders: number;
  todayRevenue: number;
  activeTables: number;
  activeSession: boolean;
  recentOrders: Order[];
  topProducts: { name: string; _sum: { quantity: number; subtotal: number } }[];
  revenueChart: { date: string; revenue: number }[];
}
