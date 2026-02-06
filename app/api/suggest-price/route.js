import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
  console.log('🔵 [SERVER] Price Suggestion API called');

  try {
    const { itemName, quantity = 1 } = await request.json();

    if (!itemName) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
    }

    console.log(`💰 [SERVER] Looking up price history for: "${itemName}"`);

    // Query transaction history for this item (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const transactions = await prisma.transaction.findMany({
      where: {
        transactionDate: {
          gte: ninetyDaysAgo,
        },
      },
      select: {
        items: true,
        transactionDate: true,
      },
      orderBy: {
        transactionDate: 'desc',
      },
      take: 500, // Limit to last 500 transactions
    });

    // Extract prices for matching items
    const priceHistory = [];
    const itemNameLower = itemName.toLowerCase();

    transactions.forEach(transaction => {
      const items = typeof transaction.items === 'string'
        ? JSON.parse(transaction.items)
        : transaction.items;

      if (Array.isArray(items)) {
        items.forEach(item => {
          // Fuzzy match item name
          const matchName = item.name?.toLowerCase() || '';
          if (
            matchName === itemNameLower ||
            matchName.includes(itemNameLower) ||
            itemNameLower.includes(matchName)
          ) {
            if (item.price && item.price > 0) {
              priceHistory.push({
                price: Number(item.price),
                date: transaction.transactionDate,
              });
            }
          }
        });
      }
    });

    console.log(`📊 [SERVER] Found ${priceHistory.length} price records for "${itemName}"`);

    // If no history found, return no suggestion
    if (priceHistory.length === 0) {
      return NextResponse.json({
        itemName,
        suggestedPrice: null,
        confidence: 'none',
        reasoning: 'No price history found for this item',
        priceHistory: [],
        stats: null,
      });
    }

    // Calculate statistics
    const prices = priceHistory.map(p => p.price);
    const sortedPrices = [...prices].sort((a, b) => a - b);

    const stats = {
      count: prices.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
      median: sortedPrices[Math.floor(sortedPrices.length / 2)],
      mode: getMostFrequent(prices),
    };

    // Determine confidence based on data quality
    let confidence = 'low';
    let suggestedPrice = stats.mode || stats.median;

    if (stats.count >= 10) {
      confidence = 'high';
      // Use mode if consistent, otherwise median
      const modeFrequency = prices.filter(p => p === stats.mode).length / prices.length;
      if (modeFrequency >= 0.5) {
        suggestedPrice = stats.mode;
      } else {
        suggestedPrice = stats.median;
      }
    } else if (stats.count >= 5) {
      confidence = 'medium';
      suggestedPrice = stats.median;
    } else {
      confidence = 'low';
      suggestedPrice = stats.average;
    }

    // Round to nearest 500 for cleaner prices
    suggestedPrice = Math.round(suggestedPrice / 500) * 500;

    // Generate reasoning
    let reasoning = '';
    if (confidence === 'high') {
      reasoning = `Based on ${stats.count} past transactions. Most common price: ${formatIDR(stats.mode)}.`;
    } else if (confidence === 'medium') {
      reasoning = `Based on ${stats.count} past transactions. Typical price range: ${formatIDR(stats.min)} - ${formatIDR(stats.max)}.`;
    } else {
      reasoning = `Limited data (${stats.count} transactions). Average price: ${formatIDR(stats.average)}.`;
    }

    console.log(`✅ [SERVER] Suggesting ${formatIDR(suggestedPrice)} (${confidence} confidence)`);

    return NextResponse.json({
      itemName,
      suggestedPrice,
      confidence,
      reasoning,
      stats: {
        count: stats.count,
        min: stats.min,
        max: stats.max,
        average: Math.round(stats.average),
        median: stats.median,
        mode: stats.mode,
      },
    });

  } catch (error) {
    console.error('❌ [SERVER] Price suggestion error:', error);
    return NextResponse.json({
      error: 'Failed to get price suggestion',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    }, { status: 500 });
  }
}

// Helper function to get most frequent value
function getMostFrequent(arr) {
  const frequency = {};
  let maxFreq = 0;
  let mode = arr[0];

  arr.forEach(value => {
    frequency[value] = (frequency[value] || 0) + 1;
    if (frequency[value] > maxFreq) {
      maxFreq = frequency[value];
      mode = value;
    }
  });

  return mode;
}

// Helper function to format IDR
function formatIDR(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
