import React, { useState, useEffect } from 'react';
import { dataService } from '@/services/dataService';
import type { Deal, Project } from '@/types/bd';
import { DEAL_TABLE_COLUMNS, MONTH_OPTIONS } from '@/types/bd';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileCheck, TrendingUp, TrendingDown } from 'lucide-react';
// 飞书时间戳兜底展示
import { formatDateSafe } from '@/lib/date';

const DealsTab: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [monthFilter, setMonthFilter] = useState<string>('all');

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

  const formatPercent = (value?: number | string): string => {
    if (value === undefined || value === null || value === '') return '-';
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return `${(n * 100).toFixed(1)}%`;
  };

  const renderCell = (deal: Deal, key: string) => {
    const raw = (deal as any)[key];
    switch (key) {
      case 'serialNo':
        return raw ?? '';
      case 'dealId':
      case 'projectId':
      case 'customerId':
      case 'projectName':
      case 'month':
        return raw ?? '';
      case 'startDate':
      case 'endDate':
      case 'firstPaymentDate':
      case 'finalPaymentDate':
        return formatDateSafe(raw) || '-';
      case 'isFinished':
        if (raw === true || raw === 'true' || raw === '是') return '是';
        if (raw === false || raw === 'false' || raw === '否') return '否';
        return raw || '-';
      case 'signCompany':
        return raw || '-';
      case 'grossMargin':
        return (
          raw !== undefined &&
          raw !== null &&
          raw !== '' && (
            <Badge
              variant="outline"
              className={
                Number(raw) >= 0.3 ? 'text-success border-success/30' : 'text-warning border-warning/30'
              }
            >
              {formatPercent(raw)}
            </Badge>
          )
        );
      case 'incomeWithTax':
      case 'incomeWithoutTax':
      case 'estimatedCost':
      case 'paidThirdPartyCost':
      case 'grossProfit':
      case 'receivedAmount':
      case 'remainingReceivable':
        return formatCurrency(raw);
      default:
        return raw ?? '-';
    }
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

      {/* 立项表格 - PC端 */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {DEAL_TABLE_COLUMNS.map((c) => (
                    <TableHead key={c.key} className={c.headClassName}>
                      {c.title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((deal, idx) => {
                  const rowKey = `${deal.dealId || 'deal'}-${deal.projectId || idx}`;
                  return (
                    <TableRow key={rowKey}>
                      {DEAL_TABLE_COLUMNS.map((c) => (
                        <TableCell key={c.key} className="text-xs">
                          {c.key === 'projectName'
                            ? getProjectName(deal)
                            : renderCell(deal, c.key)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 立项卡片 - 移动端 */}
      <div className="md:hidden space-y-3">
        {filteredDeals.map((deal, idx) => (
          <Card key={`${deal.dealId || 'deal'}-${deal.projectId || idx}`}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-sm line-clamp-2">{getProjectName(deal)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    立项ID: {deal.dealId} · 项目ID: {deal.projectId}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    客户ID: {deal.customerId || '-'}
                  </div>
                </div>
                {deal.grossMargin !== undefined && (
                  <Badge 
                    variant="outline" 
                    className={deal.grossMargin >= 0.3 ? 'text-success border-success/30' : 'text-warning border-warning/30'}
                  >
                    {formatPercent(deal.grossMargin)}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div><span className="text-muted-foreground">所属月份：</span>{deal.month ?? ''}</div>
                <div><span className="text-muted-foreground">是否完结：</span>{renderCell(deal, 'isFinished') as any}</div>
                <div><span className="text-muted-foreground">项目开始：</span>{formatDateSafe(deal.startDate) || '-'}</div>
                <div><span className="text-muted-foreground">项目结束：</span>{formatDateSafe(deal.endDate) || '-'}</div>
                <div><span className="text-muted-foreground">含税收入：</span><span className="font-medium">{formatCurrency(deal.incomeWithTax)}</span></div>
                <div><span className="text-muted-foreground">不含税收入：</span>{formatCurrency(deal.incomeWithoutTax)}</div>
                <div><span className="text-muted-foreground">预估成本：</span>{formatCurrency(deal.estimatedCost)}</div>
                <div><span className="text-muted-foreground">已付三方：</span>{formatCurrency(deal.paidThirdPartyCost)}</div>
                <div><span className="text-muted-foreground">毛利：</span>{formatCurrency(deal.grossProfit)}</div>
                <div><span className="text-muted-foreground">毛利率：</span>{formatPercent(deal.grossMargin)}</div>
                <div><span className="text-muted-foreground">已收金额：</span><span className="text-success">{formatCurrency(deal.receivedAmount)}</span></div>
                <div><span className="text-muted-foreground">剩余应收：</span><span className="text-warning">{formatCurrency(deal.remainingReceivable)}</span></div>
                <div><span className="text-muted-foreground">预计首款：</span>{formatDateSafe(deal.firstPaymentDate) || '-'}</div>
                <div><span className="text-muted-foreground">预计尾款：</span>{formatDateSafe(deal.finalPaymentDate) || '-'}</div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                签约主体：{deal.signCompany || '-'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDeals.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          暂无立项数据
        </div>
      )}
    </div>
  );
};

export default DealsTab;
