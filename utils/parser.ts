import { TransactionCategory, ParsedExpense } from '../types';

export const parseExpenseInput = (text: string): ParsedExpense => {
  const lowerText = text.toLowerCase();

  // 1. Extract Amount
  // Matches "200", "200.50", "₹200", "rs 200"
  const amountRegex = /(?:rs\.?|₹)?\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)\b/i;
  const amountMatch = lowerText.match(amountRegex);
  let amount: number | null = null;

  if (amountMatch) {
    // Remove commas and parse
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  // 2. Extract Category
  let category: TransactionCategory | null = null;

  const keywords: Record<TransactionCategory, string[]> = {
    Groceries: ['groceries', 'grocery', 'vegetables', 'fruits', 'milk', 'bread', 'market', 'supermarket', 'food', 'ration'],
    Outings: ['outings', 'outing', 'restaurant', 'cafe', 'coffee', 'tea', 'dinner', 'lunch', 'breakfast', 'movie', 'cinema', 'concert', 'uber', 'ola', 'cab', 'taxi', 'hotel', 'trip', 'party', 'fun'],
    BodyCare: ['body care', 'bodycare', 'personal care', 'salon', 'spa', 'haircut', 'gym', 'medicine', 'pharmacy', 'doctor', 'hospital', 'cream', 'soap', 'shampoo', 'conditioner', 'lotion', 'face wash', 'skincare', 'makeup', 'cosmetics', 'medical', 'health', 'toothbrush', 'paste'],
    Orders: ['orders', 'order', 'amazon', 'flipkart', 'meesho', 'myntra', 'zomato', 'swiggy', 'blinkit', 'zepto', 'online', 'delivery'],
    Petrol: ['petrol', 'diesel', 'fuel', 'gas', 'shell', 'hp', 'station', 'pump'],
    Miscellaneous: ['miscellaneous', 'misc', 'gift', 'donation', 'other', 'random'],
    Bills: ['bills', 'bill', 'electricity', 'rent', 'wifi', 'internet', 'recharge', 'subscription', 'mobile', 'water', 'fee', 'utility'],
    Savings: ['save', 'savings', 'invest', 'mutual fund', 'sip', 'deposit'],
    Other: []
  };

  for (const [cat, words] of Object.entries(keywords)) {
    if (words.some(word => lowerText.includes(word))) {
      category = cat as TransactionCategory;
      break;
    }
  }

  // Fallback if no specific category but amount exists
  if (!category && amount) {
    category = 'Miscellaneous';
  }

  // 3. Extract Date (Simple logic)
  let date = new Date();
  if (lowerText.includes('yesterday')) {
    date.setDate(date.getDate() - 1);
  }
  // "Today" is default

  // 4. Clean Description
  // Remove the amount and common filler words to create a clean description
  let description = text;

  // Remove the detected amount string
  if (amountMatch) {
    description = description.replace(amountMatch[0], '').trim();
  }

  // Remove common prepositions/fillers if they are at the start
  const fillers = ['spent', 'paid', 'bought', 'for', 'on', 'in', 'at', 'a', 'an', 'the'];
  // We want to keep the description natural, so we won't strip too aggressively,
  // but we can capitalize the first letter.

  if (description.length === 0) {
    description = category ? `${category} expense` : 'Expense';
  }

  return {
    amount,
    category,
    description: description.charAt(0).toUpperCase() + description.slice(1),
    date
  };
};

export const parseMultipleExpenses = (text: string): ParsedExpense[] => {
  // Split by comma or newline, but be careful not to split 1,000 (amounts)
  // Simple approach: Split by newline first, then by comma if it looks like a separator
  // For now, let's split by newline or comma followed by space/text

  const chunks = text.split(/,|\n/).map(c => c.trim()).filter(c => c.length > 0);

  const results = chunks.map(chunk => parseExpenseInput(chunk)).filter(item => item.amount !== null);

  // Logic: If simple split didn't find anything, maybe the whole text is one item
  if (results.length === 0) {
    const single = parseExpenseInput(text);
    return single.amount ? [single] : [];
  }

  return results;
};
