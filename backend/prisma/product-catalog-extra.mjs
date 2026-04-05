/**
 * Additional menu items per category (simple products, no nested variants).
 * Used by seed.mjs (full seed) and seed-add-products.mjs (existing DB).
 */
export const EXTRA_PRODUCTS_BY_CATEGORY = {
  Coffee: [
    { name: 'Americano', price: 170, description: 'Espresso topped with hot water', taxPercent: 5 },
    { name: 'Macchiato', price: 190, description: 'Espresso marked with a dollop of foam', taxPercent: 5 },
    { name: 'Mocha', price: 240, description: 'Chocolate espresso with steamed milk', taxPercent: 5 },
    { name: 'Flat White', price: 230, description: 'Double ristretto with velvety microfoam', taxPercent: 5 },
    { name: 'Affogato', price: 280, description: 'Espresso poured over vanilla ice cream', taxPercent: 5 },
    { name: 'Iced Latte', price: 240, description: 'Chilled latte over ice', taxPercent: 5 },
    { name: 'Cortado', price: 180, description: 'Equal parts espresso and warm milk', taxPercent: 5 },
    { name: 'Ristretto', price: 140, description: 'Short, concentrated espresso shot', taxPercent: 5 },
  ],
  Tea: [
    { name: 'Earl Grey', price: 130, description: 'Black tea with bergamot', taxPercent: 5 },
    { name: 'Jasmine Green Tea', price: 140, description: 'Fragrant green tea with jasmine', taxPercent: 5 },
    { name: 'Matcha Latte', price: 260, description: 'Whisked matcha with steamed milk', taxPercent: 5 },
    { name: 'Bubble Milk Tea', price: 220, description: 'Milk tea with chewy tapioca pearls', taxPercent: 5 },
    { name: 'Hibiscus Cooler', price: 160, description: 'Iced hibiscus with citrus', taxPercent: 5 },
  ],
  Snacks: [
    { name: 'Veg Club Sandwich', price: 160, description: 'Triple-decker with fresh vegetables', taxPercent: 5 },
    { name: 'Caesar Salad', price: 220, description: 'Romaine, parmesan, croutons, caesar dressing', taxPercent: 5 },
    { name: 'Loaded Nachos', price: 190, description: 'Tortilla chips with cheese, salsa, jalapeños', taxPercent: 5 },
    { name: 'Hummus & Pita', price: 170, description: 'Creamy hummus with warm pita bread', taxPercent: 5 },
    { name: 'Spicy Chicken Wings', price: 280, description: 'Crispy wings with house spice rub', taxPercent: 5 },
  ],
  Desserts: [
    { name: 'Red Velvet Slice', price: 200, description: 'Classic red velvet with cream cheese frosting', taxPercent: 5 },
    { name: 'Lemon Tart', price: 180, description: 'Buttery crust with tangy lemon curd', taxPercent: 5 },
    { name: 'Single Scoop Ice Cream', price: 90, description: 'Choose vanilla, chocolate, or strawberry', taxPercent: 5 },
    { name: 'Belgian Waffle', price: 210, description: 'Crisp waffle with maple syrup', taxPercent: 5 },
    { name: 'Chocolate Lava Cake', price: 240, description: 'Warm cake with molten chocolate center', taxPercent: 5 },
  ],
};
