import React, { useState, useEffect } from 'react';
import { dataService } from '@/services/dataService';
import type { Deal, Project } from '@/types/bd';
import { MONTH_OPTIONS } from '@/types/bd';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
// 飞书时间戳兜底展示
import { formatDateSafe } from '@/lib/date';

const DealsTab: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterDeals();
  }, [deals, monthFilter]);

  const loadData = async () => {
    const [dealsData, projectsData] = await Promise.all([
      dataService.getAllDeals(),
      dataService.getAllProjects(),
    ]);
    setDeals(dealsData);
    setProjects(projectsData);
  };

  const filterDeals = () => {
    let result = [...deals];

    if (monthFilter !== 'all') {
      result = result.filter(d => d.month === monthFilter);
    }

    setFilteredDeals(result);
  };

  const projectNameMap = new Map(
    projects.map((p) => [String(p.projectId || '').trim(), String(p.projectName || '').trim()])
  );

  const getProjectName = (deal: Deal): string => {
    const directName = String(deal.projectName || '').trim();
    if (directName) return directName;
    const key = String(deal.projectId || deal.dealId || '').trim();
    return projectNameMap.get(key) || '-';
  };

  const formatCurrency = (value?: number | string): string => {
    if (value === undefined || value === null || value === '') return '-';
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 }).format(n);
  };

  const renderFinishStatus = (raw: any) => {
    if (raw === true || raw === 'true' || raw === '是') return '已完结';
    if (raw === false || raw === 'false' || raw === '否') return '进行中';
    return raw || '-';
  };

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setShowDetail(true);
  };

  // 统计数据
  const totalIncome = filteredDeals.reduce((sum, d) => sum + (d.incomeWithTax || 0), 0);
  const totalReceived = filteredDeals.reduce((sum, d) => sum + (d.receivedAmount || 0), 0);
  const totalRemaining = filteredDeals.reduce((sum, d) => sum + (d.remainingReceivable || 0), 0);

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="选择月份" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部月份</SelectItem>
                {MONTH_OPTIONS.map(month => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">总收入（含税）</div>
            <div className="text-lg font-semibold text-foreground mt-1">
              {formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">已收金额</div>
            <div className="text-lg font-semibold text-success mt-1">
              {formatCurrency(totalReceived)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">剩余应收</div>
            <div className="text-lg font-semibold text-warning mt-1">
              {formatCurrency(totalRemaining)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 立项卡片 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDeals.map((deal, idx) => {
          const finishText = renderFinishStatus(deal.isFinished);
          const finishVariant = finishText === '已完结' ? 'default' : 'secondary';
          return (
            <Card
              key={`${deal.dealId || 'deal'}-${deal.projectId || idx}`}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => handleDealClick(deal)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm line-clamp-2">{getProjectName(deal)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      立项ID: {deal.dealId || '-'}
                    </div>
                  </div>
                  <Badge variant={finishVariant} className="text-xs shrink-0">
                    {finishText}
                  </Badge>
                </div>
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  <div>
                    含税收入：<span className="text-foreground">{formatCurrency(deal.incomeWithTax)}</span>
                  </div>
                  <div>签约主体：{deal.signCompany || '-'}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDeals.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          暂无立项数据
        </div>
      )}

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedDeal ? getProjectName(selectedDeal) : '立项详情'}</DialogTitle>
          </DialogHeader>
          {selectedDeal && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">立项ID：</span>
                <span className="font-mono">{selectedDeal.dealId || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">项目ID：</span>
                <span className="font-mono">{selectedDeal.projectId || '-'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">项目名称：</span>
                <span>{getProjectName(selectedDeal)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">是否完结：</span>
                <span>{renderFinishStatus(selectedDeal.isFinished)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">所属月份：</span>
                <span>{selectedDeal.month || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">项目开始：</span>
                <span>{formatDateSafe(selectedDeal.startDate) || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">项目结束：</span>
                <span>{formatDateSafe(selectedDeal.endDate) || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">含税收入：</span>
                <span>{formatCurrency(selectedDeal.incomeWithTax)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">不含税收入：</span>
                <span>{formatCurrency(selectedDeal.incomeWithoutTax)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">签约主体：</span>
                <span>{selectedDeal.signCompany || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">客户ID：</span>
                <span>{selectedDeal.customerId || '-'}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealsTab;
