import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronRight, Clock, FolderPlus, Plus, User, UserPlus } from "lucide-react";

import { dataService } from "@/services/dataService";
import type { Client, Deal, Project } from "@/types/bd";
import {
  AM_OPTIONS,
  BD_OPTIONS,
  CLIENT_LEVEL_OPTIONS,
  COOPERATION_STATUS_OPTIONS,
  COMPLETION_STATUS,
  CONTRACT_ENTITIES,
  CUSTOMER_TYPE_OPTIONS,
  INDUSTRY_OPTIONS,
  MONTH_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_STAGE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  SERVICE_TYPE_OPTIONS,
} from "@/types/bd";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type TimeEntry = { projectId: string; projectName: string; hours: number };

type NewClientDraft = {
  localId: string;
  shortName: string;
  companyName: string;
  customerType: string;
  level: string;
  industry: string;
  ownerBd: string;
  hq: string;
  isAnnual: boolean;
};

type UpdateClientDraft = NewClientDraft & {
  customerId: string; // ⚠️ 不可变
  cooperationStatus: string;
};

type NewProjectDraft = {
  localId: string;
  customerId: string;
  shortName: string;
  month: string;
  serviceType: string;
  campaignName: string;
  deliverableName: string;
  projectType: string;
  stage: string;
  priority: string;
  expectedAmount: string;
  bd: string;
  am: string;
  totalBdHours: string;
  lastUpdateDate: string; // YYYY/MM/DD
  nextFollowDate: string; // YYYY/MM/DD
};

type UpdateProjectDraft = NewProjectDraft & { projectId: string }; // ⚠️ 不可变

type DealDraft = {
  localId: string;
  dealId: string; // ⚠️ 不可变
  projectId: string;
  projectName: string;
  startDate: string;
  endDate: string;
  isFinished: string;
  contractEntity: string;
  incomeWithTax: string;
  incomeWithoutTax: string;
  estimatedCost: string;
  firstPaymentDate: string;
  finalPaymentDate: string;
  receivedAmount: string;
};

const makeLocalId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const makeDealId = () => `deal_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const isBlank = (v: unknown) => !String(v ?? "").trim();
const numOrUndef = (v: string) => {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

const formatDateSlash = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
};
const slashToInputDate = (slash: string) => String(slash || "").replace(/\//g, "-");
const inputDateToSlash = (input: string) => String(input || "").replace(/-/g, "/");
const getNextWorkingDay = (from: Date) => {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
};

const makeEmptyNewClient = (): NewClientDraft => ({
  localId: makeLocalId(),
  shortName: "",
  companyName: "",
  customerType: "",
  level: "",
  industry: "",
  ownerBd: "",
  hq: "",
  isAnnual: false,
});

const validateNewClient = (c: NewClientDraft) =>
  !isBlank(c.shortName) &&
  !isBlank(c.companyName) &&
  !isBlank(c.customerType) &&
  !isBlank(c.level) &&
  !isBlank(c.industry) &&
  !isBlank(c.hq);

const isNewClientBlank = (c: NewClientDraft) =>
  isBlank(c.shortName) &&
  isBlank(c.companyName) &&
  isBlank(c.customerType) &&
  isBlank(c.level) &&
  isBlank(c.industry) &&
  isBlank(c.ownerBd) &&
  isBlank(c.hq) &&
  !c.isAnnual;

const clientToUpdateDraft = (client: Client): UpdateClientDraft => {
  const customerId = String((client as any).customerId || client.id || "").trim();
  return {
    localId: makeLocalId(),
    customerId,
    shortName: String((client as any).shortName || "").trim(),
    companyName: String((client as any).companyName || "").trim(),
    customerType: String((client as any).customerType || "").trim(),
    level: String((client as any).level || (client as any).customerLevel || "").trim(),
    industry: String((client as any).industry || "").trim(),
    ownerBd: String((client as any).ownerBd || (client as any).owner || "").trim(),
    hq: String((client as any).hq || (client as any).hqRegion || "").trim(),
    isAnnual: Boolean((client as any).isAnnual),
    cooperationStatus: String((client as any).cooperationStatus || (client as any).status || "").trim(),
  };
};

const makeEmptyNewProjectDraft = (): NewProjectDraft => {
  const today = new Date();
  return {
    localId: makeLocalId(),
    customerId: "",
    shortName: "",
    month: "",
    serviceType: "",
    campaignName: "",
    deliverableName: "",
    projectType: "",
    stage: "",
    priority: "",
    expectedAmount: "",
    bd: "",
    am: "",
    totalBdHours: "0",
    lastUpdateDate: formatDateSlash(today),
    nextFollowDate: formatDateSlash(getNextWorkingDay(today)),
  };
};

const validateNewProject = (p: NewProjectDraft) =>
  !isBlank(p.customerId) &&
  !isBlank(p.month) &&
  !isBlank(p.serviceType) &&
  !isBlank(p.campaignName) &&
  !isBlank(p.deliverableName) &&
  !isBlank(p.projectType) &&
  !isBlank(p.stage) &&
  !isBlank(p.priority) &&
  !isBlank(p.bd);

const isNewProjectBlank = (p: NewProjectDraft) =>
  isBlank(p.customerId) &&
  isBlank(p.month) &&
  isBlank(p.serviceType) &&
  isBlank(p.campaignName) &&
  isBlank(p.deliverableName) &&
  isBlank(p.projectType) &&
  isBlank(p.stage) &&
  isBlank(p.priority) &&
  isBlank(p.bd);

const projectNameFromDraft = (p: Pick<NewProjectDraft, "month" | "shortName" | "campaignName" | "deliverableName">) =>
  `${p.month}-${p.shortName}-${p.campaignName}-${p.deliverableName}`;

const projectToUpdateDraft = (project: Project): UpdateProjectDraft => {
  const today = new Date();
  return {
    localId: makeLocalId(),
    projectId: String((project as any).projectId || "").trim(),
    customerId: String((project as any).customerId || "").trim(),
    shortName: String((project as any).shortName || "").trim(),
    month: String((project as any).month || "").trim(),
    serviceType: String((project as any).serviceType || "").trim(),
    campaignName: String((project as any).campaignName || "").trim(),
    deliverableName: String((project as any).deliverableName || "").trim(),
    projectType: String((project as any).projectType || "").trim(),
    stage: String((project as any).stage || "").trim(),
    priority: String((project as any).priority || "").trim(),
    expectedAmount: (project as any).expectedAmount != null ? String((project as any).expectedAmount) : "",
    bd: String((project as any).bd || "").trim(),
    am: String((project as any).am || "").trim(),
    totalBdHours: (project as any).totalBdHours != null ? String((project as any).totalBdHours) : "0",
    lastUpdateDate: String((project as any).lastUpdateDate || "").trim() || formatDateSlash(today),
    nextFollowDate: String((project as any).nextFollowDate || "").trim() || formatDateSlash(getNextWorkingDay(today)),
  };
};

const dealToDraft = (deal: Deal): DealDraft => ({
  localId: makeLocalId(),
  dealId: String((deal as any).dealId || "").trim(),
  projectId: String((deal as any).projectId || "").trim(),
  projectName: String((deal as any).projectName || "").trim(),
  startDate: String((deal as any).startDate || "").trim(),
  endDate: String((deal as any).endDate || "").trim(),
  isFinished: String((deal as any).isFinished ?? "").trim(),
  contractEntity: String((deal as any).contractEntity || (deal as any).signCompany || "").trim(),
  incomeWithTax: (deal as any).incomeWithTax != null ? String((deal as any).incomeWithTax) : "",
  incomeWithoutTax: (deal as any).incomeWithoutTax != null ? String((deal as any).incomeWithoutTax) : "",
  estimatedCost: (deal as any).estimatedCost != null ? String((deal as any).estimatedCost) : "",
  firstPaymentDate: String((deal as any).firstPaymentDate || "").trim(),
  finalPaymentDate: String((deal as any).finalPaymentDate || "").trim(),
  receivedAmount: (deal as any).receivedAmount != null ? String((deal as any).receivedAmount) : "0",
});

const validateDealDraft = (d: DealDraft) =>
  !isBlank(d.dealId) &&
  !isBlank(d.projectId) &&
  !isBlank(d.projectName) &&
  !isBlank(d.startDate) &&
  !isBlank(d.endDate) &&
  !isBlank(d.isFinished) &&
  !isBlank(d.contractEntity);

function OptionSelect({
  value,
  onValueChange,
  placeholder,
  options,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  options: readonly string[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((x) => (
          <SelectItem key={x} value={x}>
            {x}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SearchList({
  items,
}: {
  items: { key: string; title: string; subtitle?: string; onPick: () => void }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2 space-y-1 rounded-md border bg-background p-2">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={it.onPick}
          className="w-full text-left rounded px-2 py-1 hover:bg-muted"
        >
          <div className="text-sm font-medium truncate">{it.title}</div>
          {it.subtitle && <div className="text-xs text-muted-foreground truncate">{it.subtitle}</div>}
        </button>
      ))}
    </div>
  );
}

export default function DailyFormTab() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [projectPersonOptions, setProjectPersonOptions] = useState<{
    bd: string[];
    am: string[];
  }>({ bd: [], am: [] });

  const [hasNewClient, setHasNewClient] = useState("no");
  const [newClientDrafts, setNewClientDrafts] = useState<NewClientDraft[]>([]);
  const [newClientDraft, setNewClientDraft] = useState<NewClientDraft>(makeEmptyNewClient());

  const [hasUpdateClient, setHasUpdateClient] = useState("no");
  const [clientSearchKeyword, setClientSearchKeyword] = useState("");
  const [updateClientDrafts, setUpdateClientDrafts] = useState<UpdateClientDraft[]>([]);
  const [updateClientDraft, setUpdateClientDraft] = useState<UpdateClientDraft | null>(null);

  const [hasNewProject, setHasNewProject] = useState("no");
  const [newProjectCustomerKeyword, setNewProjectCustomerKeyword] = useState("");
  const [newProjectDrafts, setNewProjectDrafts] = useState<NewProjectDraft[]>([]);
  const [newProjectDraft, setNewProjectDraft] = useState<NewProjectDraft>(makeEmptyNewProjectDraft());

  const [hasUpdateProject, setHasUpdateProject] = useState("no");
  const [projectSearchKeyword, setProjectSearchKeyword] = useState("");
  const [updateProjectDrafts, setUpdateProjectDrafts] = useState<UpdateProjectDraft[]>([]);
  const [updateProjectDraft, setUpdateProjectDraft] = useState<UpdateProjectDraft | null>(null);
  const [pendingNewDeals, setPendingNewDeals] = useState<DealDraft[]>([]);

  const [hasUpdateDeal, setHasUpdateDeal] = useState("no");
  const [dealSearchKeyword, setDealSearchKeyword] = useState("");
  const [updateDealDrafts, setUpdateDealDrafts] = useState<DealDraft[]>([]);
  const [updateDealDraft, setUpdateDealDraft] = useState<DealDraft | null>(null);

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [selectedTimeProjectId, setSelectedTimeProjectId] = useState("");
  const [hoursInput, setHoursInput] = useState("");

  const loadData = async () => {
    try {
      const [clientsData, projectsData, dealsData] = await Promise.all([
        dataService.getAllClients(),
        dataService.getAllProjects(),
        dataService.getAllDeals(),
      ]);
      setClients(clientsData || []);
      setProjects(projectsData || []);
      setDeals(dealsData || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "加载数据失败");
    }
  };

  const loadProjectPersons = async () => {
    try {
      const res = await fetch("/api/project-persons", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) return;

      const bd = (json?.data?.bd || [])
        .map((x: any) => String(x?.name || "").trim())
        .filter(Boolean);
      const am = (json?.data?.am || [])
        .map((x: any) => String(x?.name || "").trim())
        .filter(Boolean);

      setProjectPersonOptions({ bd, am });
    } catch (e) {
      console.warn("[DailyFormTab] loadProjectPersons failed:", e);
    }
  };

  useEffect(() => {
    loadData();
    loadProjectPersons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasNewClient !== "yes") {
      setNewClientDrafts([]);
      setNewClientDraft(makeEmptyNewClient());
    }
  }, [hasNewClient]);

  useEffect(() => {
    if (hasUpdateClient !== "yes") {
      setClientSearchKeyword("");
      setUpdateClientDrafts([]);
      setUpdateClientDraft(null);
    }
  }, [hasUpdateClient]);

  useEffect(() => {
    if (hasNewProject !== "yes") {
      setNewProjectCustomerKeyword("");
      setNewProjectDrafts([]);
      setNewProjectDraft(makeEmptyNewProjectDraft());
    }
  }, [hasNewProject]);

  useEffect(() => {
    if (hasUpdateProject !== "yes") {
      setProjectSearchKeyword("");
      setUpdateProjectDrafts([]);
      setUpdateProjectDraft(null);
      setPendingNewDeals([]);
    }
  }, [hasUpdateProject]);

  useEffect(() => {
    if (hasUpdateDeal !== "yes") {
      setDealSearchKeyword("");
      setUpdateDealDrafts([]);
      setUpdateDealDraft(null);
    }
  }, [hasUpdateDeal]);

  useEffect(() => {
    if (hasUpdateProject !== "yes") return;

    const candidates = [...updateProjectDrafts, ...(updateProjectDraft ? [updateProjectDraft] : [])];
    const needDealsFor = candidates
      .filter((p) => p.projectType === "签单")
      .filter((p) => !deals.some((d: any) => String((d as any).projectId) === p.projectId));

    setPendingNewDeals((prev) => {
      const next = (prev || []).filter((d) => needDealsFor.some((p) => p.projectId === d.projectId));
      for (const p of needDealsFor) {
        const idx = next.findIndex((d) => d.projectId === p.projectId);
        const projectName = projectNameFromDraft(p);
        if (idx >= 0) {
          next[idx] = { ...next[idx], projectName };
          continue;
        }
        next.push({
          localId: makeLocalId(),
          dealId: makeDealId(),
          projectId: p.projectId,
          projectName,
          startDate: "",
          endDate: "",
          isFinished: "否",
          contractEntity: "",
          incomeWithTax: "",
          incomeWithoutTax: "",
          estimatedCost: "",
          firstPaymentDate: "",
          finalPaymentDate: "",
          receivedAmount: "0",
        });
      }
      return next;
    });
  }, [hasUpdateProject, updateProjectDrafts, updateProjectDraft, deals]);

  const clientSearchResults = useMemo(() => {
    const k = clientSearchKeyword.trim().toLowerCase();
    if (!k) return [];
    return clients
      .filter(
        (c: any) =>
          String(c?.shortName || "").toLowerCase().includes(k) ||
          String(c?.companyName || "").toLowerCase().includes(k)
      )
      .slice(0, 20);
  }, [clients, clientSearchKeyword]);

  const newProjectCustomerResults = useMemo(() => {
    const k = newProjectCustomerKeyword.trim().toLowerCase();
    if (!k) return [];
    return clients
      .filter(
        (c: any) =>
          String(c?.shortName || "").toLowerCase().includes(k) ||
          String(c?.companyName || "").toLowerCase().includes(k)
      )
      .slice(0, 20);
  }, [clients, newProjectCustomerKeyword]);

  const projectSearchResults = useMemo(() => {
    const k = projectSearchKeyword.trim().toLowerCase();
    if (!k) return [];
    return projects
      .filter((p: any) => String(p?.projectName || "").toLowerCase().includes(k))
      .slice(0, 20);
  }, [projects, projectSearchKeyword]);

  const dealSearchResults = useMemo(() => {
    const k = dealSearchKeyword.trim().toLowerCase();
    if (!k) return [];
    return deals
      .filter((d: any) => {
        const dealId = String(d?.dealId || "").toLowerCase();
        const projectId = String(d?.projectId || "").toLowerCase();
        const projectName = String(d?.projectName || "").toLowerCase();
        return dealId.includes(k) || projectId.includes(k) || projectName.includes(k);
      })
      .slice(0, 20);
  }, [deals, dealSearchKeyword]);

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3, 4, 5, 6].map((step, index) => (
        <React.Fragment key={step}>
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
              currentStep >= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {currentStep > step ? <Check className="h-4 w-4" /> : step}
          </div>
          {index < 5 && (
            <div className={cn("w-10 h-0.5 mx-2", currentStep > step ? "bg-primary" : "bg-muted")} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const handleAddTimeEntry = () => {
    if (!selectedTimeProjectId || !hoursInput) return toast.error("请选择项目并输入时间");
    const hours = parseFloat(hoursInput);
    if (!Number.isFinite(hours) || hours <= 0) return toast.error("请输入有效的时间（小时）");
    const project = projects.find((p: any) => p.projectId === selectedTimeProjectId) as any;
    if (!project) return;
    if (timeEntries.some((e) => e.projectId === selectedTimeProjectId)) return toast.error("该项目已添加");
    setTimeEntries((prev) => [...prev, { projectId: selectedTimeProjectId, projectName: project.projectName, hours }]);
    setSelectedTimeProjectId("");
    setHoursInput("");
  };

  const handleSubmit = async () => {
    if (timeEntries.length === 0) return toast.error("请至少添加一个项目的时间记录");
    try {
      const today = formatDateSlash(new Date());
      const nextFollowDate = formatDateSlash(getNextWorkingDay(new Date()));
      for (const entry of timeEntries) {
        const project = projects.find((p: any) => p.projectId === entry.projectId) as any;
        if (!project) continue;
        await dataService.updateProject(entry.projectId, {
          totalBdHours: (project.totalBdHours || 0) + entry.hours,
          lastUpdateDate: today,
          nextFollowDate,
        } as any);
      }
      await dataService.createDailyForm({
        date: new Date().toISOString().split("T")[0],
        hasNewClient: hasNewClient === "yes",
        hasNewOrUpdateProject: hasNewProject === "yes" || hasUpdateProject === "yes",
        projectEntries: timeEntries.map((e) => ({ projectId: e.projectId, projectName: e.projectName, bdHours: e.hours })),
      } as any);
      toast.success("每日表单提交成功");

      setCurrentStep(1);
      setHasNewClient("no");
      setHasUpdateClient("no");
      setHasNewProject("no");
      setHasUpdateProject("no");
      setHasUpdateDeal("no");

      setNewClientDrafts([]);
      setNewClientDraft(makeEmptyNewClient());
      setUpdateClientDrafts([]);
      setUpdateClientDraft(null);
      setClientSearchKeyword("");

      setNewProjectDrafts([]);
      setNewProjectDraft(makeEmptyNewProjectDraft());
      setNewProjectCustomerKeyword("");

      setUpdateProjectDrafts([]);
      setUpdateProjectDraft(null);
      setProjectSearchKeyword("");
      setPendingNewDeals([]);

      setUpdateDealDrafts([]);
      setUpdateDealDraft(null);
      setDealSearchKeyword("");

      setTimeEntries([]);
      setSelectedTimeProjectId("");
      setHoursInput("");

      await loadData();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "提交失败");
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (hasNewClient === "yes") {
        const candidates = [...newClientDrafts];
        const includeCurrent = candidates.length === 0 || !isNewClientBlank(newClientDraft);
        if (includeCurrent) candidates.push(newClientDraft);
        if (candidates.length === 0) return toast.error("请至少新增 1 个客户");
        for (let i = 0; i < candidates.length; i += 1) {
          if (!validateNewClient(candidates[i])) return toast.error(`第 ${i + 1} 个客户信息未填完整（带 * 的必填）`);
        }
        try {
          for (const c of candidates) {
            await dataService.createClient({
              shortName: c.shortName.trim(),
              companyName: c.companyName.trim(),
              customerType: c.customerType.trim(),
              level: c.level.trim(),
              cooperationStatus: "潜在",
              industry: c.industry.trim(),
              hq: c.hq.trim(),
              isAnnual: Boolean(c.isAnnual),
              ownerBd: c.ownerBd.trim(),
              relatedProjectIds: [],
            } as any);
          }
          toast.success(`客户创建成功（已写回飞书）：${candidates.length} 个`);
          setNewClientDrafts([]);
          setNewClientDraft(makeEmptyNewClient());
          await loadData();
        } catch (e: any) {
          console.error(e);
          return toast.error(e?.message || "创建客户失败");
        }
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (hasUpdateClient === "yes") {
        const candidates = [...updateClientDrafts, ...(updateClientDraft ? [updateClientDraft] : [])];
        if (candidates.length === 0) return toast.error("请至少选择 1 个要更新的客户");
        for (let i = 0; i < candidates.length; i += 1) {
          const c = candidates[i];
          if (isBlank(c.customerId) || !validateNewClient(c)) return toast.error(`第 ${i + 1} 个客户信息未填完整（带 * 的必填）`);
        }
        try {
          for (const c of candidates) {
            const { customerId, ...patch } = c;
            await dataService.updateClient(customerId, { ...patch, cooperationStatus: c.cooperationStatus } as any);
          }
          toast.success(`客户更新成功（已写回飞书）：${candidates.length} 个`);
          setUpdateClientDrafts([]);
          setUpdateClientDraft(null);
          setClientSearchKeyword("");
          await loadData();
        } catch (e: any) {
          console.error(e);
          return toast.error(e?.message || "更新客户失败");
        }
      }
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      if (hasNewProject === "yes") {
        const candidates = [...newProjectDrafts];
        const includeCurrent = candidates.length === 0 || !isNewProjectBlank(newProjectDraft);
        if (includeCurrent) candidates.push(newProjectDraft);
        if (candidates.length === 0) return toast.error("请至少新增 1 条项目");
        for (let i = 0; i < candidates.length; i += 1) {
          if (!validateNewProject(candidates[i])) return toast.error(`第 ${i + 1} 条项目必填项未填完整（带 * 的必填）`);
        }
        try {
          for (const p of candidates) {
            await dataService.createProject({
              customerId: p.customerId,
              shortName: p.shortName,
              projectName: projectNameFromDraft(p),
              month: p.month,
              serviceType: p.serviceType,
              campaignName: p.campaignName,
              deliverableName: p.deliverableName,
              projectType: p.projectType as any,
              stage: p.stage as any,
              priority: p.priority as any,
              expectedAmount: numOrUndef(p.expectedAmount),
              bd: p.bd,
              am: p.am || undefined,
              totalBdHours: numOrUndef(p.totalBdHours) ?? 0,
              lastUpdateDate: p.lastUpdateDate,
              nextFollowDate: p.nextFollowDate,
            } as any);
          }
          toast.success(`项目创建成功（已写回飞书）：${candidates.length} 条`);
          setNewProjectDrafts([]);
          setNewProjectDraft(makeEmptyNewProjectDraft());
          setNewProjectCustomerKeyword("");
          await loadData();
        } catch (e: any) {
          console.error(e);
          return toast.error(e?.message || "创建项目失败");
        }
      }
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      if (hasUpdateProject === "yes") {
        const candidates = [...updateProjectDrafts, ...(updateProjectDraft ? [updateProjectDraft] : [])];
        if (candidates.length === 0) return toast.error("请至少选择 1 条要更新的项目");
        for (let i = 0; i < candidates.length; i += 1) {
          const p = candidates[i];
          if (isBlank(p.projectId) || !validateNewProject(p)) return toast.error(`第 ${i + 1} 条项目必填项未填完整（带 * 的必填）`);
        }
        for (let i = 0; i < pendingNewDeals.length; i += 1) {
          if (!validateDealDraft(pendingNewDeals[i])) return toast.error(`第 ${i + 1} 条立项信息未填完整（带 * 的必填）`);
        }
        try {
          for (const p of candidates) {
            await dataService.updateProject(p.projectId, {
              projectName: projectNameFromDraft(p),
              customerId: p.customerId,
              shortName: p.shortName,
              month: p.month,
              serviceType: p.serviceType,
              campaignName: p.campaignName,
              deliverableName: p.deliverableName,
              projectType: p.projectType as any,
              stage: p.stage as any,
              priority: p.priority as any,
              expectedAmount: numOrUndef(p.expectedAmount),
              bd: p.bd,
              am: p.am || undefined,
              totalBdHours: numOrUndef(p.totalBdHours) ?? 0,
              lastUpdateDate: p.lastUpdateDate,
              nextFollowDate: p.nextFollowDate,
            } as any);
          }
          for (const d of pendingNewDeals) {
            await dataService.createDeal({
              dealId: d.dealId,
              projectId: d.projectId,
              projectName: d.projectName,
              startDate: d.startDate,
              endDate: d.endDate,
              isFinished: d.isFinished,
              signCompany: d.contractEntity,
              contractEntity: d.contractEntity,
              incomeWithTax: numOrUndef(d.incomeWithTax),
              incomeWithoutTax: numOrUndef(d.incomeWithoutTax),
              estimatedCost: numOrUndef(d.estimatedCost),
              receivedAmount: numOrUndef(d.receivedAmount),
              firstPaymentDate: d.firstPaymentDate,
              finalPaymentDate: d.finalPaymentDate,
              month: "",
            } as any);
          }
          toast.success(`项目更新成功（已写回飞书）：${candidates.length} 条`);
          if (pendingNewDeals.length) toast.success(`签单项目已自动立项：${pendingNewDeals.length} 条`);
          setUpdateProjectDrafts([]);
          setUpdateProjectDraft(null);
          setProjectSearchKeyword("");
          setPendingNewDeals([]);
          await loadData();
        } catch (e: any) {
          console.error(e);
          return toast.error(e?.message || "更新项目失败");
        }
      }
      setCurrentStep(5);
      return;
    }

    if (currentStep === 5) {
      if (hasUpdateDeal === "yes") {
        const candidates = [...updateDealDrafts, ...(updateDealDraft ? [updateDealDraft] : [])];
        if (candidates.length === 0) return toast.error("请至少选择 1 条要更新的立项");
        for (let i = 0; i < candidates.length; i += 1) {
          if (!validateDealDraft(candidates[i])) return toast.error(`第 ${i + 1} 条立项信息未填完整（带 * 的必填）`);
        }
        try {
          for (const d of candidates) {
            const { dealId, ...patch } = d;
            await dataService.updateDeal(dealId, {
              ...patch,
              signCompany: d.contractEntity,
              contractEntity: d.contractEntity,
              incomeWithTax: numOrUndef(d.incomeWithTax),
              incomeWithoutTax: numOrUndef(d.incomeWithoutTax),
              estimatedCost: numOrUndef(d.estimatedCost),
              receivedAmount: numOrUndef(d.receivedAmount),
            } as any);
          }
          toast.success(`立项更新成功（已写回飞书）：${candidates.length} 条`);
          setUpdateDealDrafts([]);
          setUpdateDealDraft(null);
          setDealSearchKeyword("");
          await loadData();
        } catch (e: any) {
          console.error(e);
          return toast.error(e?.message || "更新立项失败");
        }
      }
      setCurrentStep(6);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <StepIndicator />

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> 步骤 1：今天是否有新增客户？
            </CardTitle>
            <CardDescription>合作状态默认“潜在”；公司地区必填。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={hasNewClient} onValueChange={setHasNewClient}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="s1-no" />
                <Label htmlFor="s1-no">否</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="s1-yes" />
                <Label htmlFor="s1-yes">是</Label>
              </div>
            </RadioGroup>

            {hasNewClient === "yes" && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>客户/部门简称 *</Label>
                    <Input value={newClientDraft.shortName} onChange={(e) => setNewClientDraft({ ...newClientDraft, shortName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>公司名称 *</Label>
                    <Input value={newClientDraft.companyName} onChange={(e) => setNewClientDraft({ ...newClientDraft, companyName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>客户类型 *</Label>
                    <OptionSelect value={newClientDraft.customerType} onValueChange={(v) => setNewClientDraft({ ...newClientDraft, customerType: v })} placeholder="选择客户类型" options={CUSTOMER_TYPE_OPTIONS} />
                  </div>
                  <div className="space-y-2">
                    <Label>客户等级 *</Label>
                    <OptionSelect value={newClientDraft.level} onValueChange={(v) => setNewClientDraft({ ...newClientDraft, level: v })} placeholder="选择等级" options={CLIENT_LEVEL_OPTIONS} />
                  </div>
                  <div className="space-y-2">
                    <Label>行业 *</Label>
                    <OptionSelect value={newClientDraft.industry} onValueChange={(v) => setNewClientDraft({ ...newClientDraft, industry: v })} placeholder="选择行业" options={INDUSTRY_OPTIONS} />
                  </div>
                  <div className="space-y-2">
                    <Label>主BD</Label>
                    <OptionSelect value={newClientDraft.ownerBd} onValueChange={(v) => setNewClientDraft({ ...newClientDraft, ownerBd: v })} placeholder="选择BD（可选）" options={BD_OPTIONS} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>公司地区 *</Label>
                    <Input value={newClientDraft.hq} onChange={(e) => setNewClientDraft({ ...newClientDraft, hq: e.target.value })} placeholder="中国深圳/中国上海/新加坡" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center gap-2">
                      <input id="isAnnualNew" type="checkbox" checked={newClientDraft.isAnnual} onChange={(e) => setNewClientDraft({ ...newClientDraft, isAnnual: e.target.checked })} />
                      <Label htmlFor="isAnnualNew">年框客户</Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">已添加 {newClientDrafts.length} 个新增客户</div>
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    if (!validateNewClient(newClientDraft)) return toast.error("请把当前客户必填项填写完整后再添加下一条（带 * 的必填）");
                    setNewClientDrafts((prev) => [...prev, newClientDraft]);
                    setNewClientDraft(makeEmptyNewClient());
                  }}>
                    <Plus className="mr-1 h-4 w-4" /> 添加一个客户
                  </Button>
                </div>

                {newClientDrafts.length > 0 && (
                  <div className="space-y-2">
                    <Label>待写回客户列表</Label>
                    {newClientDrafts.map((c, idx) => (
                      <div key={c.localId} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{idx + 1}. {c.shortName || "-"}</div>
                          <div className="text-xs text-muted-foreground truncate">{c.companyName || "-"}</div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setNewClientDrafts((prev) => prev.filter((x) => x.localId !== c.localId))}>移除</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={handleNext}>下一步 <ChevronRight className="ml-1 h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> 步骤 2：是否更新已有客户数据？
            </CardTitle>
            <CardDescription>选择“否”会直接进入步骤 3；选择“是”可搜索并批量修改。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={hasUpdateClient} onValueChange={setHasUpdateClient}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="s2-no" />
                <Label htmlFor="s2-no">否</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="s2-yes" />
                <Label htmlFor="s2-yes">是</Label>
              </div>
            </RadioGroup>

            {hasUpdateClient === "yes" && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>搜索客户</Label>
                  <Input
                    value={clientSearchKeyword}
                    onChange={(e) => setClientSearchKeyword(e.target.value)}
                    placeholder="输入客户简称/公司名称"
                  />
                  <SearchList
                    items={clientSearchResults.map((c: any) => ({
                      key: String(c.customerId || c.id),
                      title: String(c.shortName || "-"),
                      subtitle: `ID: ${String(c.customerId || c.id)}`,
                      onPick: () => {
                        const draft = clientToUpdateDraft(c);
                        if (!draft.customerId) return toast.error("该客户缺少 customerId，无法更新");
                        if (
                          updateClientDrafts.some((x) => x.customerId === draft.customerId) ||
                          updateClientDraft?.customerId === draft.customerId
                        ) {
                          return toast.error("该客户已在待更新列表中");
                        }
                        setUpdateClientDraft(draft);
                        setClientSearchKeyword("");
                      },
                    }))}
                  />
                </div>

                {updateClientDraft && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>客户ID（不可修改）</Label>
                        <Input value={updateClientDraft.customerId} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>客户/部门简称 *</Label>
                        <Input
                          value={updateClientDraft.shortName}
                          onChange={(e) => setUpdateClientDraft({ ...updateClientDraft, shortName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>公司名称 *</Label>
                        <Input
                          value={updateClientDraft.companyName}
                          onChange={(e) => setUpdateClientDraft({ ...updateClientDraft, companyName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>客户类型 *</Label>
                        <OptionSelect
                          value={updateClientDraft.customerType}
                          onValueChange={(v) => setUpdateClientDraft({ ...updateClientDraft, customerType: v })}
                          placeholder="选择客户类型"
                          options={CUSTOMER_TYPE_OPTIONS}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>客户等级 *</Label>
                        <OptionSelect
                          value={updateClientDraft.level}
                          onValueChange={(v) => setUpdateClientDraft({ ...updateClientDraft, level: v })}
                          placeholder="选择等级"
                          options={CLIENT_LEVEL_OPTIONS}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>合作状态</Label>
                        <OptionSelect
                          value={updateClientDraft.cooperationStatus}
                          onValueChange={(v) =>
                            setUpdateClientDraft({ ...updateClientDraft, cooperationStatus: v })
                          }
                          placeholder="选择合作状态"
                          options={COOPERATION_STATUS_OPTIONS}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>行业 *</Label>
                        <OptionSelect
                          value={updateClientDraft.industry}
                          onValueChange={(v) => setUpdateClientDraft({ ...updateClientDraft, industry: v })}
                          placeholder="选择行业"
                          options={INDUSTRY_OPTIONS}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>主BD</Label>
                        <OptionSelect
                          value={updateClientDraft.ownerBd}
                          onValueChange={(v) => setUpdateClientDraft({ ...updateClientDraft, ownerBd: v })}
                          placeholder="选择BD（可选）"
                          options={BD_OPTIONS}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>公司地区 *</Label>
                        <Input
                          value={updateClientDraft.hq}
                          onChange={(e) => setUpdateClientDraft({ ...updateClientDraft, hq: e.target.value })}
                          placeholder="中国深圳/中国上海/新加坡"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <div className="flex items-center gap-2">
                          <input
                            id="isAnnualUpdate"
                            type="checkbox"
                            checked={updateClientDraft.isAnnual}
                            onChange={(e) =>
                              setUpdateClientDraft({ ...updateClientDraft, isAnnual: e.target.checked })
                            }
                          />
                          <Label htmlFor="isAnnualUpdate">年框客户</Label>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-muted-foreground">
                        已添加 {updateClientDrafts.length} 个待更新客户
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!updateClientDraft) return;
                          if (!validateNewClient(updateClientDraft) || isBlank(updateClientDraft.customerId)) {
                            return toast.error("请把当前客户必填项填写完整后再添加下一条（带 * 的必填）");
                          }
                          if (updateClientDrafts.some((x) => x.customerId === updateClientDraft.customerId)) {
                            return toast.error("该客户已在待更新列表中");
                          }
                          setUpdateClientDrafts((prev) => [...prev, updateClientDraft]);
                          setUpdateClientDraft(null);
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" /> 添加一个要修改的客户
                      </Button>
                    </div>

                    {updateClientDrafts.length > 0 && (
                      <div className="space-y-2">
                        <Label>待更新客户列表</Label>
                        {updateClientDrafts.map((c, idx) => (
                          <div key={c.localId} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {idx + 1}. {c.shortName || "-"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">ID: {c.customerId}</div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setUpdateClientDrafts((prev) => prev.filter((x) => x.localId !== c.localId))}
                            >
                              移除
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                上一步
              </Button>
              <Button onClick={handleNext}>
                下一步 <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" /> 步骤 3：今天是否有新增项目？
            </CardTitle>
            <CardDescription>选择“是”后，先搜索客户，再填写项目字段，可用 “+” 增加多条。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={hasNewProject} onValueChange={setHasNewProject}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="s3-no" />
                <Label htmlFor="s3-no">否</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="s3-yes" />
                <Label htmlFor="s3-yes">是</Label>
              </div>
            </RadioGroup>

            {hasNewProject === "yes" && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>搜索客户（自动补全）*</Label>
                  <Input
                    value={newProjectCustomerKeyword}
                    onChange={(e) => setNewProjectCustomerKeyword(e.target.value)}
                    placeholder="输入客户简称/公司名称"
                  />
                  <SearchList
                    items={newProjectCustomerResults.map((c: any) => ({
                      key: String(c.customerId || c.id),
                      title: String(c.shortName || "-"),
                      subtitle: `ID: ${String(c.customerId || c.id)}`,
                      onPick: () => {
                        setNewProjectDraft((prev) => ({
                          ...prev,
                          customerId: String(c.customerId || c.id).trim(),
                          shortName: String(c.shortName || "").trim(),
                        }));
                        setNewProjectCustomerKeyword("");
                      },
                    }))}
                  />
                </div>

                {!isBlank(newProjectDraft.customerId) && (
                  <div className="rounded-md border px-3 py-2 text-sm">
                    已选择客户：<span className="font-medium">{newProjectDraft.shortName || "-"}</span>{" "}
                    <span className="text-muted-foreground">（ID: {newProjectDraft.customerId}）</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>所属月份 *</Label>
                    <OptionSelect
                      value={newProjectDraft.month}
                      onValueChange={(v) => setNewProjectDraft({ ...newProjectDraft, month: v })}
                      placeholder="选择月份"
                      options={MONTH_OPTIONS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>服务类型 *</Label>
                    <OptionSelect
                      value={newProjectDraft.serviceType}
                      onValueChange={(v) => setNewProjectDraft({ ...newProjectDraft, serviceType: v })}
                      placeholder="选择服务类型"
                      options={SERVICE_TYPE_OPTIONS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>活动名称 *</Label>
                    <Input
                      value={newProjectDraft.campaignName}
                      onChange={(e) => setNewProjectDraft({ ...newProjectDraft, campaignName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>交付名称 *</Label>
                    <Input
                      value={newProjectDraft.deliverableName}
                      onChange={(e) => setNewProjectDraft({ ...newProjectDraft, deliverableName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>项目类别 *</Label>
                    <OptionSelect
                      value={newProjectDraft.projectType}
                      onValueChange={(v) => setNewProjectDraft({ ...newProjectDraft, projectType: v })}
                      placeholder="选择类别"
                      options={PROJECT_TYPE_OPTIONS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>项目进度 *</Label>
                    <OptionSelect
                      value={newProjectDraft.stage}
                      onValueChange={(v) => setNewProjectDraft({ ...newProjectDraft, stage: v })}
                      placeholder="选择进度"
                      options={PROJECT_STAGE_OPTIONS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>优先级 *</Label>
                    <OptionSelect
                      value={newProjectDraft.priority}
                      onValueChange={(v) => setNewProjectDraft({ ...newProjectDraft, priority: v })}
                      placeholder="选择优先级"
                      options={PROJECT_PRIORITY_OPTIONS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>预估项目金额</Label>
                    <Input
                      type="number"
                      value={newProjectDraft.expectedAmount}
                      onChange={(e) => setNewProjectDraft({ ...newProjectDraft, expectedAmount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>BD *</Label>
                    <OptionSelect
                      value={newProjectDraft.bd}
                      onValueChange={(v) => setNewProjectDraft({ ...newProjectDraft, bd: v })}
                      placeholder="选择BD"
                      options={
                        projectPersonOptions.bd.length > 0
                          ? projectPersonOptions.bd
                          : BD_OPTIONS
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>AM</Label>
                    <OptionSelect
                      value={newProjectDraft.am}
                      onValueChange={(v) => setNewProjectDraft({ ...newProjectDraft, am: v })}
                      placeholder="选择AM（可选）"
                      options={
                        projectPersonOptions.am.length > 0
                          ? projectPersonOptions.am
                          : AM_OPTIONS
                      }
                    />
                    {projectPersonOptions.am.length === 0 && (
                      <div className="text-xs text-muted-foreground">
                        AM 人员列表当前为空：请先在飞书项目表任意记录的 AM 列选择一次对应人员，或配置后端
                        `FEISHU_PERSON_ID_MAP`。
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>累计商务时间（hr）</Label>
                    <Input
                      type="number"
                      value={newProjectDraft.totalBdHours}
                      onChange={(e) => setNewProjectDraft({ ...newProjectDraft, totalBdHours: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>最新更新日期</Label>
                    <Input
                      type="date"
                      value={slashToInputDate(newProjectDraft.lastUpdateDate)}
                      onChange={(e) => setNewProjectDraft({ ...newProjectDraft, lastUpdateDate: inputDateToSlash(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>下次跟进日期</Label>
                    <Input
                      type="date"
                      value={slashToInputDate(newProjectDraft.nextFollowDate)}
                      onChange={(e) => setNewProjectDraft({ ...newProjectDraft, nextFollowDate: inputDateToSlash(e.target.value) })}
                    />
                  </div>
                </div>

                {!isBlank(newProjectDraft.month) &&
                  !isBlank(newProjectDraft.shortName) &&
                  !isBlank(newProjectDraft.campaignName) &&
                  !isBlank(newProjectDraft.deliverableName) && (
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <span className="text-muted-foreground">项目名称预览：</span>
                      <span className="font-medium">{projectNameFromDraft(newProjectDraft)}</span>
                    </div>
                  )}

                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">已添加 {newProjectDrafts.length} 条新增项目</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!validateNewProject(newProjectDraft)) {
                        return toast.error("请把当前项目必填项填写完整后再添加下一条（带 * 的必填）");
                      }
                      setNewProjectDrafts((prev) => [...prev, newProjectDraft]);
                      setNewProjectDraft(makeEmptyNewProjectDraft());
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" /> 添加一个项目
                  </Button>
                </div>

                {newProjectDrafts.length > 0 && (
                  <div className="space-y-2">
                    <Label>待写回项目列表</Label>
                    {newProjectDrafts.map((p, idx) => (
                      <div key={p.localId} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{idx + 1}. {projectNameFromDraft(p)}</div>
                          <div className="text-xs text-muted-foreground truncate">客户ID: {p.customerId}</div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setNewProjectDrafts((prev) => prev.filter((x) => x.localId !== p.localId))}>
                          移除
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                上一步
              </Button>
              <Button onClick={handleNext}>
                下一步 <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4 */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" /> 步骤 4：是否更新已有项目状态？
            </CardTitle>
            <CardDescription>若把项目类别改为“签单”，会要求填写立项信息并自动写回立项表。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={hasUpdateProject} onValueChange={setHasUpdateProject}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="s4-no" />
                <Label htmlFor="s4-no">否</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="s4-yes" />
                <Label htmlFor="s4-yes">是</Label>
              </div>
            </RadioGroup>

            {hasUpdateProject === "yes" && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>搜索项目</Label>
                  <Input
                    value={projectSearchKeyword}
                    onChange={(e) => setProjectSearchKeyword(e.target.value)}
                    placeholder="输入项目名称关键字"
                  />
                  <SearchList
                    items={projectSearchResults.map((p: any) => ({
                      key: String(p.projectId),
                      title: String(p.projectName || "-"),
                      subtitle: `项目ID: ${String(p.projectId)}`,
                      onPick: () => {
                        const draft = projectToUpdateDraft(p);
                        if (!draft.projectId) return toast.error("该项目缺少 projectId，无法更新");
                        if (
                          updateProjectDrafts.some((x) => x.projectId === draft.projectId) ||
                          updateProjectDraft?.projectId === draft.projectId
                        ) {
                          return toast.error("该项目已在待更新列表中");
                        }
                        setUpdateProjectDraft(draft);
                        setProjectSearchKeyword("");
                      },
                    }))}
                  />
                </div>

                {updateProjectDraft && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>项目ID（不可修改）</Label>
                        <Input value={updateProjectDraft.projectId} disabled />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>客户ID（不可修改）</Label>
                        <Input value={updateProjectDraft.customerId} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>所属月份 *</Label>
                        <OptionSelect
                          value={updateProjectDraft.month}
                          onValueChange={(v) => setUpdateProjectDraft({ ...updateProjectDraft, month: v })}
                          placeholder="选择月份"
                          options={MONTH_OPTIONS}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>服务类型 *</Label>
                        <OptionSelect
                          value={updateProjectDraft.serviceType}
                          onValueChange={(v) => setUpdateProjectDraft({ ...updateProjectDraft, serviceType: v })}
                          placeholder="选择服务类型"
                          options={SERVICE_TYPE_OPTIONS}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>活动名称 *</Label>
                        <Input value={updateProjectDraft.campaignName} onChange={(e) => setUpdateProjectDraft({ ...updateProjectDraft, campaignName: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>交付名称 *</Label>
                        <Input value={updateProjectDraft.deliverableName} onChange={(e) => setUpdateProjectDraft({ ...updateProjectDraft, deliverableName: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>项目类别 *</Label>
                        <OptionSelect
                          value={updateProjectDraft.projectType}
                          onValueChange={(v) => setUpdateProjectDraft({ ...updateProjectDraft, projectType: v })}
                          placeholder="选择类别"
                          options={PROJECT_TYPE_OPTIONS}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>项目进度 *</Label>
                        <OptionSelect
                          value={updateProjectDraft.stage}
                          onValueChange={(v) => setUpdateProjectDraft({ ...updateProjectDraft, stage: v })}
                          placeholder="选择进度"
                          options={PROJECT_STAGE_OPTIONS}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>优先级 *</Label>
                        <OptionSelect
                          value={updateProjectDraft.priority}
                          onValueChange={(v) => setUpdateProjectDraft({ ...updateProjectDraft, priority: v })}
                          placeholder="选择优先级"
                          options={PROJECT_PRIORITY_OPTIONS}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>预估项目金额</Label>
                        <Input type="number" value={updateProjectDraft.expectedAmount} onChange={(e) => setUpdateProjectDraft({ ...updateProjectDraft, expectedAmount: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>BD *</Label>
                        <OptionSelect
                          value={updateProjectDraft.bd}
                          onValueChange={(v) =>
                            setUpdateProjectDraft({ ...updateProjectDraft, bd: v })
                          }
                          placeholder="选择BD"
                          options={
                            projectPersonOptions.bd.length > 0
                              ? projectPersonOptions.bd
                              : BD_OPTIONS
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>AM</Label>
                        <OptionSelect
                          value={updateProjectDraft.am}
                          onValueChange={(v) =>
                            setUpdateProjectDraft({ ...updateProjectDraft, am: v })
                          }
                          placeholder="选择AM（可选）"
                          options={
                            projectPersonOptions.am.length > 0
                              ? projectPersonOptions.am
                              : AM_OPTIONS
                          }
                        />
                        {projectPersonOptions.am.length === 0 && (
                          <div className="text-xs text-muted-foreground">
                            AM 人员列表当前为空：请先在飞书项目表任意记录的 AM
                            列选择一次对应人员，或配置后端 `FEISHU_PERSON_ID_MAP`。
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>累计商务时间（hr）</Label>
                        <Input type="number" value={updateProjectDraft.totalBdHours} onChange={(e) => setUpdateProjectDraft({ ...updateProjectDraft, totalBdHours: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>最新更新日期</Label>
                        <Input type="date" value={slashToInputDate(updateProjectDraft.lastUpdateDate)} onChange={(e) => setUpdateProjectDraft({ ...updateProjectDraft, lastUpdateDate: inputDateToSlash(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label>下次跟进日期</Label>
                        <Input type="date" value={slashToInputDate(updateProjectDraft.nextFollowDate)} onChange={(e) => setUpdateProjectDraft({ ...updateProjectDraft, nextFollowDate: inputDateToSlash(e.target.value) })} />
                      </div>
                    </div>

                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <span className="text-muted-foreground">项目名称预览：</span>
                      <span className="font-medium">{projectNameFromDraft(updateProjectDraft)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-muted-foreground">已添加 {updateProjectDrafts.length} 条待更新项目</div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!updateProjectDraft) return;
                          if (!validateNewProject(updateProjectDraft) || isBlank(updateProjectDraft.projectId)) {
                            return toast.error("请把当前项目必填项填写完整后再添加下一条（带 * 的必填）");
                          }
                          if (updateProjectDrafts.some((x) => x.projectId === updateProjectDraft.projectId)) {
                            return toast.error("该项目已在待更新列表中");
                          }
                          setUpdateProjectDrafts((prev) => [...prev, updateProjectDraft]);
                          setUpdateProjectDraft(null);
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" /> 添加一个要更新的项目
                      </Button>
                    </div>

                    {updateProjectDrafts.length > 0 && (
                      <div className="space-y-2">
                        <Label>待更新项目列表</Label>
                        {updateProjectDrafts.map((p, idx) => (
                          <div key={p.localId} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{idx + 1}. {projectNameFromDraft(p)}</div>
                              <div className="text-xs text-muted-foreground truncate">项目ID: {p.projectId}</div>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setUpdateProjectDrafts((prev) => prev.filter((x) => x.localId !== p.localId))}>
                              移除
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {pendingNewDeals.length > 0 && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="text-sm font-medium">签单项目需要立项信息（将自动写回立项表）</div>
                    {pendingNewDeals.map((d, idx) => (
                      <div key={d.projectId} className="rounded-md border p-3 space-y-3">
                        <div className="text-sm font-medium">{idx + 1}. {d.projectName}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2 sm:col-span-2">
                            <Label>立项ID（系统生成，不可修改）*</Label>
                            <Input value={d.dealId} disabled />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>项目ID（不可修改）*</Label>
                            <Input value={d.projectId} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>项目开始时间 *</Label>
                            <Input type="date" value={slashToInputDate(d.startDate)} onChange={(e) => setPendingNewDeals((prev) => prev.map((x) => x.projectId === d.projectId ? { ...x, startDate: inputDateToSlash(e.target.value) } : x))} />
                          </div>
                          <div className="space-y-2">
                            <Label>项目结束时间 *</Label>
                            <Input type="date" value={slashToInputDate(d.endDate)} onChange={(e) => setPendingNewDeals((prev) => prev.map((x) => x.projectId === d.projectId ? { ...x, endDate: inputDateToSlash(e.target.value) } : x))} />
                          </div>
                          <div className="space-y-2">
                            <Label>是否完结 *</Label>
                            <OptionSelect value={d.isFinished} onValueChange={(v) => setPendingNewDeals((prev) => prev.map((x) => x.projectId === d.projectId ? { ...x, isFinished: v } : x))} placeholder="选择" options={COMPLETION_STATUS} />
                          </div>
                          <div className="space-y-2">
                            <Label>签约公司主体 *</Label>
                            <OptionSelect value={d.contractEntity} onValueChange={(v) => setPendingNewDeals((prev) => prev.map((x) => x.projectId === d.projectId ? { ...x, contractEntity: v } : x))} placeholder="选择签约主体" options={CONTRACT_ENTITIES} />
                          </div>
                          <div className="space-y-2"><Label>含税收入</Label><Input type="number" value={d.incomeWithTax} onChange={(e) => setPendingNewDeals((prev) => prev.map((x) => x.projectId === d.projectId ? { ...x, incomeWithTax: e.target.value } : x))} /></div>
                          <div className="space-y-2"><Label>不含税收入</Label><Input type="number" value={d.incomeWithoutTax} onChange={(e) => setPendingNewDeals((prev) => prev.map((x) => x.projectId === d.projectId ? { ...x, incomeWithoutTax: e.target.value } : x))} /></div>
                          <div className="space-y-2"><Label>预估成本</Label><Input type="number" value={d.estimatedCost} onChange={(e) => setPendingNewDeals((prev) => prev.map((x) => x.projectId === d.projectId ? { ...x, estimatedCost: e.target.value } : x))} /></div>
                          <div className="space-y-2"><Label>已收金额</Label><Input type="number" value={d.receivedAmount} onChange={(e) => setPendingNewDeals((prev) => prev.map((x) => x.projectId === d.projectId ? { ...x, receivedAmount: e.target.value } : x))} /></div>
                          <div className="space-y-2"><Label>预计首款时间</Label><Input type="date" value={slashToInputDate(d.firstPaymentDate)} onChange={(e) => setPendingNewDeals((prev) => prev.map((x) => x.projectId === d.projectId ? { ...x, firstPaymentDate: inputDateToSlash(e.target.value) } : x))} /></div>
                          <div className="space-y-2"><Label>预计尾款时间</Label><Input type="date" value={slashToInputDate(d.finalPaymentDate)} onChange={(e) => setPendingNewDeals((prev) => prev.map((x) => x.projectId === d.projectId ? { ...x, finalPaymentDate: inputDateToSlash(e.target.value) } : x))} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                上一步
              </Button>
              <Button onClick={handleNext}>
                下一步 <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5 */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" /> 步骤 5：是否更新已有立项项目？
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={hasUpdateDeal} onValueChange={setHasUpdateDeal}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="s5-no" />
                <Label htmlFor="s5-no">否</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="s5-yes" />
                <Label htmlFor="s5-yes">是</Label>
              </div>
            </RadioGroup>

            {hasUpdateDeal === "yes" && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>搜索立项</Label>
                  <Input value={dealSearchKeyword} onChange={(e) => setDealSearchKeyword(e.target.value)} placeholder="立项ID/项目ID/项目名称" />
                  <SearchList
                    items={dealSearchResults.map((d: any) => ({
                      key: String(d.dealId),
                      title: String(d.projectName || d.dealId || "-"),
                      subtitle: `立项ID: ${String(d.dealId)} / 项目ID: ${String(d.projectId || "-")}`,
                      onPick: () => {
                        const draft = dealToDraft(d);
                        if (!draft.dealId) return toast.error("该立项缺少 dealId，无法更新");
                        if (updateDealDrafts.some((x) => x.dealId === draft.dealId) || updateDealDraft?.dealId === draft.dealId) return toast.error("该立项已在待更新列表中");
                        setUpdateDealDraft(draft);
                        setDealSearchKeyword("");
                      },
                    }))}
                  />
                </div>

                {updateDealDraft && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 sm:col-span-2"><Label>立项ID（不可修改）*</Label><Input value={updateDealDraft.dealId} disabled /></div>
                      <div className="space-y-2 sm:col-span-2"><Label>项目ID（不可修改）*</Label><Input value={updateDealDraft.projectId} disabled /></div>
                      <div className="space-y-2 sm:col-span-2"><Label>项目名称 *</Label><Input value={updateDealDraft.projectName} onChange={(e) => setUpdateDealDraft({ ...updateDealDraft, projectName: e.target.value })} /></div>
                      <div className="space-y-2"><Label>项目开始时间 *</Label><Input type="date" value={slashToInputDate(updateDealDraft.startDate)} onChange={(e) => setUpdateDealDraft({ ...updateDealDraft, startDate: inputDateToSlash(e.target.value) })} /></div>
                      <div className="space-y-2"><Label>项目结束时间 *</Label><Input type="date" value={slashToInputDate(updateDealDraft.endDate)} onChange={(e) => setUpdateDealDraft({ ...updateDealDraft, endDate: inputDateToSlash(e.target.value) })} /></div>
                      <div className="space-y-2"><Label>是否完结 *</Label><OptionSelect value={updateDealDraft.isFinished} onValueChange={(v) => setUpdateDealDraft({ ...updateDealDraft, isFinished: v })} placeholder="选择" options={COMPLETION_STATUS} /></div>
                      <div className="space-y-2"><Label>签约公司主体 *</Label><OptionSelect value={updateDealDraft.contractEntity} onValueChange={(v) => setUpdateDealDraft({ ...updateDealDraft, contractEntity: v })} placeholder="选择签约主体" options={CONTRACT_ENTITIES} /></div>
                      <div className="space-y-2"><Label>含税收入</Label><Input type="number" value={updateDealDraft.incomeWithTax} onChange={(e) => setUpdateDealDraft({ ...updateDealDraft, incomeWithTax: e.target.value })} /></div>
                      <div className="space-y-2"><Label>不含税收入</Label><Input type="number" value={updateDealDraft.incomeWithoutTax} onChange={(e) => setUpdateDealDraft({ ...updateDealDraft, incomeWithoutTax: e.target.value })} /></div>
                      <div className="space-y-2"><Label>预估成本</Label><Input type="number" value={updateDealDraft.estimatedCost} onChange={(e) => setUpdateDealDraft({ ...updateDealDraft, estimatedCost: e.target.value })} /></div>
                      <div className="space-y-2"><Label>已收金额</Label><Input type="number" value={updateDealDraft.receivedAmount} onChange={(e) => setUpdateDealDraft({ ...updateDealDraft, receivedAmount: e.target.value })} /></div>
                      <div className="space-y-2"><Label>预计首款时间</Label><Input type="date" value={slashToInputDate(updateDealDraft.firstPaymentDate)} onChange={(e) => setUpdateDealDraft({ ...updateDealDraft, firstPaymentDate: inputDateToSlash(e.target.value) })} /></div>
                      <div className="space-y-2"><Label>预计尾款时间</Label><Input type="date" value={slashToInputDate(updateDealDraft.finalPaymentDate)} onChange={(e) => setUpdateDealDraft({ ...updateDealDraft, finalPaymentDate: inputDateToSlash(e.target.value) })} /></div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-muted-foreground">已添加 {updateDealDrafts.length} 条待更新立项</div>
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        if (!updateDealDraft) return;
                        if (!validateDealDraft(updateDealDraft)) return toast.error("请把当前立项必填项填写完整后再添加下一条（带 * 的必填）");
                        if (updateDealDrafts.some((x) => x.dealId === updateDealDraft.dealId)) return toast.error("该立项已在待更新列表中");
                        setUpdateDealDrafts((prev) => [...prev, updateDealDraft]);
                        setUpdateDealDraft(null);
                      }}><Plus className="mr-1 h-4 w-4" /> 添加一个要修改的立项</Button>
                    </div>

                    {updateDealDrafts.length > 0 && (
                      <div className="space-y-2">
                        <Label>待更新立项列表</Label>
                        {updateDealDrafts.map((d, idx) => (
                          <div key={d.localId} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{idx + 1}. {d.projectName || "-"}</div>
                              <div className="text-xs text-muted-foreground truncate">立项ID: {d.dealId}</div>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setUpdateDealDrafts((prev) => prev.filter((x) => x.localId !== d.localId))}>移除</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(4)}>
                上一步
              </Button>
              <Button onClick={handleNext}>
                下一步 <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> 步骤 6：今日商务时间</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedTimeProjectId} onValueChange={setSelectedTimeProjectId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="选择项目" /></SelectTrigger>
                <SelectContent>
                  {projects.filter((p: any) => !timeEntries.some((e) => e.projectId === p.projectId)).map((p: any) => (
                    <SelectItem key={String(p.projectId)} value={String(p.projectId)}>{String(p.projectName || p.projectId)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="number" placeholder="小时" value={hoursInput} onChange={(e) => setHoursInput(e.target.value)} className="w-24" step="0.5" min="0" />
              <Button onClick={handleAddTimeEntry} size="icon" type="button"><Plus className="h-4 w-4" /></Button>
            </div>

            {timeEntries.length > 0 && (
              <div className="space-y-2">
                {timeEntries.map((entry) => (
                  <div key={entry.projectId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1 min-w-0"><div className="font-medium text-sm truncate">{entry.projectName}</div></div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-sm font-medium">{entry.hours}h</span>
                      <Button variant="ghost" size="sm" type="button" onClick={() => setTimeEntries((prev) => prev.filter((x) => x.projectId !== entry.projectId))} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">×</Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end text-sm text-muted-foreground">总计：{timeEntries.reduce((sum, e) => sum + e.hours, 0)} 小时</div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(5)}>上一步</Button>
              <Button onClick={handleSubmit}>提交表单 <Check className="ml-1 h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
