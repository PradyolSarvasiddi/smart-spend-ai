import Groq from 'groq-sdk';
import { ParsedExpense, TransactionCategory } from '../types';

const apiKey = import.meta.env.VITE_GROQ_API_KEY || 'demo_key_for_client_side';
const groq = new Groq({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
});

export async function parseExpenseWithAI(input: string): Promise<ParsedExpense[]> {
    if (!input || input.trim().length < 3) {
        return [];
    }

    const prompt = `
    You are an intelligent expense parser. Extract one or more expenses from the user's input.
    Input: "${input}"

    Return ONLY a JSON object with a single key "expenses" which is an array of objects.
    Each object in the array should have:
    - "amount" (number, required)
    - "category" (one of: Groceries, Outings, BodyCare [e.g. shampoo, salon, gym, meds], Orders, Petrol, Miscellaneous, Bills, Savings, Other)
    - "description" (short summary)
    - "date" (ISO string, assume today is ${new Date().toISOString()} if not specified)

    If amount is missing for an item, skip it.
    If category is unclear, use "Miscellaneous".
  `;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that parses expense text into JSON. Output valid JSON only."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama3-8b-8192",
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("No content received from AI");

        const result = JSON.parse(content);
        const expenses = Array.isArray(result.expenses) ? result.expenses : [];

        // Normalization Map for strict Enum compliance
        const CATEGORY_MAP: Record<string, TransactionCategory> = {
            'Groceries': 'Groceries', 'Grocery': 'Groceries', 'Food': 'Groceries',
            'Outings': 'Outings', 'Outing': 'Outings', 'Restaurant': 'Outings', 'Entertainment': 'Outings',
            'BodyCare': 'BodyCare', 'Body Care': 'BodyCare', 'Personal Care': 'BodyCare', 'Health': 'BodyCare',
            'Orders': 'Orders', 'Order': 'Orders', 'Shopping': 'Orders',
            'Petrol': 'Petrol', 'Fuel': 'Petrol', 'Transport': 'Petrol',
            'Miscellaneous': 'Miscellaneous', 'Misc': 'Miscellaneous',
            'Bills': 'Bills',
            'Savings': 'Savings',
            'Other': 'Other'
        };

        return expenses.map((item: any) => {
            const rawCat = item.category || 'Miscellaneous';
            const normalizedCat = CATEGORY_MAP[rawCat] || CATEGORY_MAP[rawCat.replace(/\s+/g, '')] || 'Miscellaneous';

            return {
                amount: item.amount,
                category: normalizedCat,
                description: item.description || input,
                date: item.date ? new Date(item.date) : new Date()
            };
        }).filter((e: ParsedExpense) => e.amount !== null);

    } catch (error) {
        console.error("Error parsing with AI:", error);
        return [];
    }

}
