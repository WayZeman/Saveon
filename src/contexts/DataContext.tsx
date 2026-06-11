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
    sourceCategories: { id: string; name: string; isShared: boolean }[];
    createdByUser: { id: string; email: string; role: string };
  }>;
  goalsSummary: {
    totalTarget: number;
    totalCollected: number;
    totalRemaining: number;
    fillPercent: number;
  };
  monthlyData: { month: string; income: number; expense: number }[];
  pieData: { name: string; value: number; chartValue: number }[];
  categoryBreakdown: { name: string; net: number }[];
  categoryBreakdownTotal: number;
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
  sourceCategoryId: string | null;
  createdAt: string;
  category: { id: string; name: string; isShared: boolean };
  sourceCategory: { id: string; name: string; isShared: boolean } | null;
};

export type Category = {
  id: string;
  name: string;
  isShared: boolean;
  tier?: "primary" | "secondary";
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
  sourceCategories: { id: string; name: string; isShared: boolean }[];
  createdByUser: { id: string; email: string; role: string };
};

export type Partner = { id: string; email: string; role: string } | null;

export type PartnerInviteIncoming = {
  id: string;
  recipientRole: string;
  createdAt: string;
  fromUser: { id: string; name: string; email: string };
} | null;

export type PartnerInviteOutgoing = {
  id: string;
  toEmail: string;
  recipientRole: string;
  createdAt: string;
} | null;

type DataState = {
  user: User;
  partner: Partner;
  incomingPartnerInvite: PartnerInviteIncoming;
  outgoingPartnerInvite: PartnerInviteOutgoing;
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

const DEV_PREVIEW_STATE: DataState = {
  user: {
    id: "preview-user",
    name: "Preview User",
    email: "preview@local.dev",
    role: "husband",
    partnerId: "preview-partner",
  },
  partner: { id: "preview-partner", email: "partner@local.dev", role: "wife" },
  incomingPartnerInvite: null,
  outgoingPartnerInvite: null,
  dashboardData: {
    myBalance: 1870.54,
    partnerBalance: 842.3,
    totalBalance: 2712.84,
    hasPartner: true,
    goals: [
      {
        id: "goal-1",
        title: "Прибудова",
        targetAmount: 19000,
        isShared: true,
        realizedAt: null,
        balanceUsed: 2712.84,
        remainingNeeded: 16287.16,
        progressPercent: 14.28,
        sourceCategories: [
          { id: "cat-1", name: "Готівка", isShared: true },
          { id: "cat-2", name: "Акції", isShared: true },
          { id: "cat-3", name: "Крипта", isShared: false },
        ],
        createdByUser: { id: "preview-user", email: "preview@local.dev", role: "husband" },
      },
      {
        id: "goal-2",
        title: "Авто",
        targetAmount: 12000,
        isShared: true,
        realizedAt: null,
        balanceUsed: 1870.54,
        remainingNeeded: 10129.46,
        progressPercent: 15.59,
        sourceCategories: [{ id: "cat-1", name: "Готівка", isShared: true }],
        createdByUser: { id: "preview-user", email: "preview@local.dev", role: "husband" },
      },
    ],
    goalsSummary: {
      totalTarget: 31000,
      totalCollected: 2712.84,
      totalRemaining: 28287.16,
      fillPercent: 8.75,
    },
    monthlyData: [
      { month: "01", income: 23000, expense: 16500 },
      { month: "02", income: 18000, expense: 14900 },
      { month: "03", income: 21500, expense: 17100 },
      { month: "04", income: 20800, expense: 18350 },
      { month: "05", income: 24000, expense: 19600 },
    ],
    pieData: [
      { name: "Готівка", value: 1870.54, chartValue: 1870.54 },
      { name: "Акції", value: 552.03, chartValue: 552.03 },
      { name: "Крипта", value: 290.27, chartValue: 290.27 },
    ],
    categoryBreakdown: [
      { name: "Готівка", net: 1870.54 },
      { name: "Акції", net: 552.03 },
      { name: "Крипта", net: 290.27 },
    ],
    categoryBreakdownTotal: 2712.84,
    comparison: {
      mySaved: 1870.54,
      partnerSaved: 842.3,
      myExpense: 9870,
      partnerExpense: 7640,
      myIncome: 23000,
      partnerIncome: 15000,
    },
  },
  transactions: [
    {
      id: "tx-1",
      amount: 1200,
      type: "income",
      categoryId: "cat-1",
      sourceCategoryId: null,
      createdAt: new Date().toISOString(),
      category: { id: "cat-1", name: "Готівка", isShared: true },
      sourceCategory: null,
    },
  ],
  categories: [
    { id: "cat-1", name: "Готівка", isShared: true, tier: "primary", userId: null, _count: { transactions: 4 } },
    { id: "cat-2", name: "Акції", isShared: true, tier: "primary", userId: null, _count: { transactions: 2 } },
    { id: "cat-3", name: "Крипта", isShared: false, tier: "secondary", userId: "preview-user", _count: { transactions: 1 } },
  ],
  goals: [
    {
      id: "goal-1",
      title: "Прибудова",
      targetAmount: 19000,
      isShared: true,
      createdBy: "preview-user",
      realizedAt: null,
      sourceCategories: [
        { id: "cat-1", name: "Готівка", isShared: true },
        { id: "cat-2", name: "Акції", isShared: true },
        { id: "cat-3", name: "Крипта", isShared: false },
      ],
      createdByUser: { id: "preview-user", email: "preview@local.dev", role: "husband" },
    },
    {
      id: "goal-2",
      title: "Авто",
      targetAmount: 12000,
      isShared: true,
      createdBy: "preview-user",
      realizedAt: null,
      sourceCategories: [{ id: "cat-1", name: "Готівка", isShared: true }],
      createdByUser: { id: "preview-user", email: "preview@local.dev", role: "husband" },
    },
  ],
  initialLoadDone: true,
};

export function DataProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<DataState>({
    user: null,
    partner: null,
    incomingPartnerInvite: null,
    outgoingPartnerInvite: null,
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
      const isDevPreview =
        typeof window !== "undefined" &&
        process.env.NODE_ENV !== "production" &&
        new URLSearchParams(window.location.search).get("preview") === "1";

      if (isDevPreview) {
        setState(DEV_PREVIEW_STATE);
        return;
      }

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
      const goalsRaw = goalsRes.ok ? await goalsRes.json() : [];
      const goals = Array.isArray(goalsRaw)
        ? goalsRaw.map((g: Goal) => ({ ...g, sourceCategories: g.sourceCategories ?? [] }))
        : [];
      const partnerData = partnerRes.ok
        ? await partnerRes.json()
        : { partner: null, incomingInvite: null, outgoingInvite: null };
      const partner = partnerData.partner ?? null;
      const incomingPartnerInvite = partnerData.incomingInvite ?? null;
      const outgoingPartnerInvite = partnerData.outgoingInvite ?? null;

      setState({
        user,
        partner,
        incomingPartnerInvite,
        outgoingPartnerInvite,
        dashboardData,
        transactions,
        categories,
        goals,
        initialLoadDone: true,
      });
    } catch (error) {
      console.error("[data] initial load failed", error);
      setState((s) => ({ ...s, initialLoadDone: true }));
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
    const data = res.ok
      ? await res.json()
      : { partner: null, incomingInvite: null, outgoingInvite: null };
    setState((s) => ({
      ...s,
      partner: data.partner ?? null,
      incomingPartnerInvite: data.incomingInvite ?? null,
      outgoingPartnerInvite: data.outgoingInvite ?? null,
    }));
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
    const raw = await res.json();
    const goals = Array.isArray(raw)
      ? raw.map((g: Goal) => ({ ...g, sourceCategories: g.sourceCategories ?? [] }))
      : [];
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
