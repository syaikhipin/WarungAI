import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create default user
  const user = await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Demo User',
      email: 'demo@warungai.local',
      businessName: 'Demo Restaurant',
      businessType: 'Restaurant',
    },
  })
  console.log('Created user:', user.name)

  // Create sample menu items
  const menuItems = [
    {
      name: 'Cheeseburger',
      price: 8.99,
      category: 'Food',
      aliases: JSON.stringify(['burger', 'cheese burger', 'hamburger with cheese']),
    },
    {
      name: 'Chicken Sandwich',
      price: 7.50,
      category: 'Food',
      aliases: JSON.stringify(['chicken burger', 'grilled chicken', 'chicken sub']),
    },
    {
      name: 'French Fries',
      price: 3.50,
      category: 'Food',
      aliases: JSON.stringify(['fries', 'chips', 'potato fries']),
    },
    {
      name: 'Caesar Salad',
      price: 6.99,
      category: 'Food',
      aliases: JSON.stringify(['salad', 'caesar', 'green salad']),
    },
    {
      name: 'Margherita Pizza',
      price: 12.99,
      category: 'Food',
      aliases: JSON.stringify(['pizza', 'cheese pizza', 'margherita']),
    },
    {
      name: 'Pepperoni Pizza',
      price: 14.99,
      category: 'Food',
      aliases: JSON.stringify(['pepperoni', 'meat pizza']),
    },
    {
      name: 'Spaghetti Carbonara',
      price: 11.50,
      category: 'Food',
      aliases: JSON.stringify(['spaghetti', 'carbonara', 'pasta carbonara']),
    },
    {
      name: 'Grilled Chicken',
      price: 13.99,
      category: 'Food',
      aliases: JSON.stringify(['chicken', 'grilled chicken breast', 'roasted chicken']),
    },
    {
      name: 'Fish and Chips',
      price: 10.99,
      category: 'Food',
      aliases: JSON.stringify(['fish', 'fried fish', 'fish fries']),
    },
    {
      name: 'Hot Dog',
      price: 5.50,
      category: 'Food',
      aliases: JSON.stringify(['hotdog', 'sausage', 'dog']),
    },
    {
      name: 'Coca Cola',
      price: 2.50,
      category: 'Drinks',
      aliases: JSON.stringify(['coke', 'cola', 'coca']),
    },
    {
      name: 'Pepsi',
      price: 2.50,
      category: 'Drinks',
      aliases: JSON.stringify(['pepsi cola']),
    },
    {
      name: 'Sprite',
      price: 2.50,
      category: 'Drinks',
      aliases: JSON.stringify(['lemon soda', 'lemonade soda']),
    },
    {
      name: 'Orange Juice',
      price: 3.50,
      category: 'Drinks',
      aliases: JSON.stringify(['oj', 'orange', 'fresh orange']),
    },
    {
      name: 'Apple Juice',
      price: 3.50,
      category: 'Drinks',
      aliases: JSON.stringify(['apple', 'fresh apple']),
    },
    {
      name: 'Iced Tea',
      price: 2.99,
      category: 'Drinks',
      aliases: JSON.stringify(['ice tea', 'cold tea', 'tea']),
    },
    {
      name: 'Coffee',
      price: 3.00,
      category: 'Drinks',
      aliases: JSON.stringify(['black coffee', 'hot coffee', 'americano']),
    },
    {
      name: 'Latte',
      price: 4.50,
      category: 'Drinks',
      aliases: JSON.stringify(['cafe latte', 'milk coffee', 'latte coffee']),
    },
    {
      name: 'Cappuccino',
      price: 4.50,
      category: 'Drinks',
      aliases: JSON.stringify(['cappucino', 'cap']),
    },
    {
      name: 'Water',
      price: 1.00,
      category: 'Drinks',
      aliases: JSON.stringify(['bottled water', 'mineral water', 'plain water']),
    },
  ]

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: menuItems.indexOf(item) + 1 },
      update: item,
      create: {
        ...item,
        userId: 1,
      },
    })
  }
  console.log(`Created ${menuItems.length} menu items`)

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
