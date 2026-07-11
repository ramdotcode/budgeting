export type CategoryType = "income" | "expense";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  created_at: string;
}

export interface Income {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
  categories?: Pick<Category, "name" | "icon" | "color"> | null;
}

export interface Budget {
  id: string;
  user_id: string;
  period: string;
  created_at: string;
}

export interface BudgetItem {
  id: string;
  user_id: string;
  budget_id: string;
  category_id: string;
  allocated_amount: number;
  categories?: Pick<Category, "name" | "icon" | "color"> | null;
}

export interface Expense {
  id: string;
  user_id: string;
  budget_item_id: string;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

export interface BudgetSummaryRow {
  budget_item_id: string;
  user_id: string;
  period: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  allocated_amount: number;
  spent: number;
  remaining: number;
}
