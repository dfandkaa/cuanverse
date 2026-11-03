/**
 * Strict TypeScript types matching supabase/schema.sql.
 * DECIMAL columns are typed as `number` (PostgREST serialises numeric as JSON numbers).
 * TIMESTAMPTZ / DATE columns are ISO-8601 strings.
 */

export type ISODateTime = string;
export type ISODate = string;

export type WalletType = 'cash' | 'bank' | 'e-wallet' | 'crypto' | 'investment';
export type CategoryType = 'income' | 'expense';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type InventoryItemType = 'potion' | 'armor' | 'decoration' | 'mascot_skin';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_sprite_id: string;
  level: number;
  current_exp: number;
  next_level_exp: number;
  gold_coins: number;
  /** 0 - 100 */
  kingdom_health_score: number;
  streak_days: number;
  last_login_date: ISODateTime;
  created_at: ISODateTime;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  type: WalletType;
  balance: number;
  currency: string;
  pixel_skin_id: string;
  created_at: ISODateTime;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon_sprite: string;
  type: CategoryType;
  is_essential: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  category_id: string | null;
  amount: number;
  type: TransactionType;
  description: string | null;
  receipt_image_url: string | null;
  loot_generated_id: string | null;
  exp_gained: number;
  transaction_date: ISODateTime;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  monthly_limit: number;
  current_spent: number;
  /** 1 - 12 */
  month: number;
  year: number;
  hp_status: number;
}

export interface SavingsQuest {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: ISODate | null;
  building_unlock_id: string;
  is_completed: boolean;
}

export interface DebtBoss {
  id: string;
  user_id: string;
  boss_name: string;
  boss_sprite_id: string;
  total_hp: number;
  current_hp: number;
  interest_rate: number;
  minimum_monthly_payment: number;
  is_defeated: boolean;
}

export interface InventoryItem {
  id: string;
  user_id: string;
  item_name: string;
  item_type: InventoryItemType;
  effect_description: string | null;
  is_equipped: boolean;
  acquired_at: ISODateTime;
}

export interface Guild {
  id: string;
  name: string;
  guild_code: string;
  total_vault_savings: number;
  created_at: ISODateTime;
}

export interface GuildMember {
  guild_id: string;
  user_id: string;
  role: string;
}

/** Builds an Insert type: `R` keys are required, everything else optional. */
type InsertOf<T, R extends keyof T> = Pick<T, R> & Partial<Omit<T, R>>;

export type UserInsert = InsertOf<User, 'id' | 'email' | 'username'>;
export type WalletInsert = InsertOf<Wallet, 'user_id' | 'name' | 'type'>;
export type CategoryInsert = InsertOf<Category, 'user_id' | 'name' | 'icon_sprite' | 'type'>;
export type TransactionInsert = InsertOf<Transaction, 'user_id' | 'wallet_id' | 'amount' | 'type'>;
export type BudgetInsert = InsertOf<Budget, 'user_id' | 'monthly_limit' | 'month' | 'year'>;
export type SavingsQuestInsert = InsertOf<
  SavingsQuest,
  'user_id' | 'title' | 'target_amount' | 'building_unlock_id'
>;
export type DebtBossInsert = InsertOf<
  DebtBoss,
  | 'user_id'
  | 'boss_name'
  | 'boss_sprite_id'
  | 'total_hp'
  | 'current_hp'
  | 'interest_rate'
  | 'minimum_monthly_payment'
>;
export type InventoryItemInsert = InsertOf<InventoryItem, 'user_id' | 'item_name' | 'item_type'>;
export type GuildInsert = InsertOf<Guild, 'name' | 'guild_code'>;
export type GuildMemberInsert = InsertOf<GuildMember, 'guild_id' | 'user_id'>;

export interface CompleteOnboardingArgs {
  p_username: string;
  p_avatar_sprite_id: string;
  p_monthly_savings_target: number;
  p_monthly_spending_budget: number;
  p_cash_balance: number;
  p_bank_balance: number;
}

/** Generic for `createBrowserClient<Database>` / `createServerClient<Database>`. */
export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: UserInsert; Update: Partial<User>; Relationships: [] };
      wallets: { Row: Wallet; Insert: WalletInsert; Update: Partial<Wallet>; Relationships: [] };
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: Partial<Category>;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: TransactionInsert;
        Update: Partial<Transaction>;
        Relationships: [];
      };
      budgets: { Row: Budget; Insert: BudgetInsert; Update: Partial<Budget>; Relationships: [] };
      savings_quests: {
        Row: SavingsQuest;
        Insert: SavingsQuestInsert;
        Update: Partial<SavingsQuest>;
        Relationships: [];
      };
      debt_bosses: {
        Row: DebtBoss;
        Insert: DebtBossInsert;
        Update: Partial<DebtBoss>;
        Relationships: [];
      };
      inventory: {
        Row: InventoryItem;
        Insert: InventoryItemInsert;
        Update: Partial<InventoryItem>;
        Relationships: [];
      };
      guilds: { Row: Guild; Insert: GuildInsert; Update: Partial<Guild>; Relationships: [] };
      guild_members: {
        Row: GuildMember;
        Insert: GuildMemberInsert;
        Update: Partial<GuildMember>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      complete_onboarding: { Args: CompleteOnboardingArgs; Returns: undefined };
      is_guild_member: { Args: { p_guild_id: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
