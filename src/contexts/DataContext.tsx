"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

// Типи даних від API (один раз завантажуються, оновлюються тільки після дій користувача)
export type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  partnerId: string | null;
} | null;

export type DashboardData = {
  myBalance: number;
  partnerBalance: number;
  totalBalance: number;
  hasPartner: boolean;
  goals: Array<{
    id: string;
    title: string;
    targetAmount: number;
    isShared: boolean;
    realizedAt: string | null;
    balanceUsed: number;
    remainingNeeded: number;
    progressPercent: number;
    createdByUser: { id: string; email: string; role: string };
  }>;
  monthlyData: { month: string; income: number; expense: number }[];
  pieData: { name: string; value: number }[];
  comparison: {
    mySaved: number;
    partnerSaved: number;
    myExpense: number;
    partnerExpense: number;
    myIncome?: number;
    partnerIncome?: number;
  } | null;
  period?: { start: string; end: string };
};

export type Transaction = {
  id: string;
  amount: number;
  type: string;
  categoryId: string;
  createdAt: string;
  category: { id: string; name: string; isShared: boolean };
};

export type Category = {
  id: string;
  name: string;
  isShared: boolean;
  userId: string | null;
  _count?: { transactions: number };
};

export type Goal = {
  id: string;
  title: string;
  targetAmount: number;
  isShared: boolean;
  createdBy: string;
  realizedAt: string | null;
  createdByUser: { id: string; email: string; role: string };
};

export type Partner = { id: string; email: string; role: string } | null;

type DataState = {
  user: User;
  partner: Partner;
  dashboardData: DashboardData | null;
  transactions: Transaction[];
  categories: Category[];
  goals: Goal[];
  initialLoadDone: boolean;
};

type DataContextValue = DataState & {
  setUser: (u: User | ((prev: User) => User)) => void;
  setPartner: (p: Partner | ((prev: Partner) => Partner)) => void;
  setDashboardData: (d: DashboardData | null | ((prev: DashboardData | null) => DashboardData | null)) => void;
  setTransactions: (t: Transaction[] | ((prev: Transaction[]) => Transaction[])) => void;
  setCategories: (c: Category[] | ((prev: Category[]) => Category[])) => void;
  setGoals: (g: Goal[] | ((prev: Goal[]) => Goal[])) => void;
  refetchUser: () => Promise<void>;
  refetchPartner: () => Promise<void>;
  refetchDashboard: () => Promise<void>;
  refetchTransactions: () => Promise<void>;
  refetchCategories: () => Promise<void>;
  refetchGoals: () => Promise<void>;
  invalidateAfterMutation: (kind: "transaction" | "category" | "goal") => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<DataState>({
    user: null,
    partner: null,
    dashboardData: null,
    transactions: [],
    categories: [],
    goals: [],
    initialLoadDone: false,
  });
  const loadingRef = useRef(false);

  const loadInitial = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const meRes = await fetch("/api/auth/me");
      if (meRes.status === 401) {
        router.replace("/login");
        return;
      }
      const user = meRes.ok ? await meRes.json() : null;

      const [dashboardRes, transactionsRes, categoriesRes, goalsRes, partnerRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/transactions"),
        fetch("/api/categories"),
        fetch("/api/goals"),
        fetch("/api/partner"),
      ]);

      const dashboardData = dashboardRes.ok ? await dashboardRes.json() : null;
      const transactions = transactionsRes.ok ? await transactionsRes.json() : [];
      const categories = categoriesRes.ok ? await categoriesRes.json() : [];
      const goals = goalsRes.ok ? await goalsRes.json() : [];
      const partnerData = partnerRes.ok ? await partnerRes.json() : { partner: null };
      const partner = partnerData.partner ?? null;

      setState({
        user,
        partner,
        dashboardData,
        transactions,
        categories,
        goals,
        initialLoadDone: true,
      });
    } finally {
      loadingRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const setUser = useCallback((u: User | ((prev: User) => User)) => {
    setState((s) => ({ ...s, user: typeof u === "function" ? u(s.user) : u }));
  }, []);
  const setPartner = useCallback((p: Partner | ((prev: Partner) => Partner)) => {
    setState((s) => ({ ...s, partner: typeof p === "function" ? p(s.partner) : p }));
  }, []);
  const setDashboardData = useCallback(
    (d: DashboardData | null | ((prev: DashboardData | null) => DashboardData | null)) => {
      setState((s) => ({ ...s, dashboardData: typeof d === "function" ? d(s.dashboardData) : d }));
    },
    []
  );
  const setTransactions = useCallback(
    (t: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
      setState((s) => ({ ...s, transactions: typeof t === "function" ? t(s.transactions) : t }));
    },
    []
  );
  const setCategories = useCallback(
    (c: Category[] | ((prev: Category[]) => Category[])) => {
      setState((s) => ({ ...s, categories: typeof c === "function" ? c(s.categories) : c }));
    },
    []
  );
  const setGoals = useCallback(
    (g: Goal[] | ((prev: Goal[]) => Goal[])) => {
      setState((s) => ({ ...s, goals: typeof g === "function" ? g(s.goals) : g }));
    },
    []
  );

  const refetchUser = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    const user = res.ok ? await res.json() : null;
    setState((s) => ({ ...s, user }));
  }, [router]);

  const refetchPartner = useCallback(async () => {
    const res = await fetch("/api/partner");
    const data = res.ok ? await res.json() : { partner: null };
    setState((s) => ({ ...s, partner: data.partner ?? null }));
  }, []);

  const refetchDashboard = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    if (!res.ok) return;
    const dashboardData = await res.json();
    setState((s) => ({ ...s, dashboardData }));
  }, []);

  const refetchTransactions = useCallback(async () => {
    const res = await fetch("/api/transactions");
    if (!res.ok) return;
    const transactions = await res.json();
    setState((s) => ({ ...s, transactions }));
  }, []);

  const refetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (!res.ok) return;
    const categories = await res.json();
    setState((s) => ({ ...s, categories }));
  }, []);

  const refetchGoals = useCallback(async () => {
    const res = await fetch("/api/goals");
    if (!res.ok) return;
    const goals = await res.json();
    setState((s) => ({ ...s, goals }));
  }, []);

  const invalidateAfterMutation = useCallback(
    async (kind: "transaction" | "category" | "goal") => {
      if (kind === "transaction") {
        await Promise.all([refetchTransactions(), refetchDashboard()]);
      } else if (kind === "category") {
        await Promise.all([refetchCategories(), refetchDashboard()]);
      } else {
        await Promise.all([refetchGoals(), refetchDashboard()]);
      }
    },
    [refetchTransactions, refetchCategories, refetchGoals, refetchDashboard]
  );

  const value: DataContextValue = {
    ...state,
    setUser,
    setPartner,
    setDashboardData,
    setTransactions,
    setCategories,
    setGoals,
    refetchUser,
    refetchPartner,
    refetchDashboard,
    refetchTransactions,
    refetchCategories,
    refetchGoals,
    invalidateAfterMutation,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
