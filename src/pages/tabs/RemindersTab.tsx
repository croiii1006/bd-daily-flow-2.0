import React, { useState, useEffect, useCallback, useRef } from 'react';
import { dataService } from '@/services/dataService';
import type { UnfinishedReminderItem, FinishedReminderItem, ReminderLevel } from '@/types/bd';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, AlertTriangle, Calendar, Clock, CheckCircle2, FileText, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { initUserProfileFromWindow, renderUserProfile } from '@/lib/feishuUserProfile';
import { formatDateSafe } from '@/lib/date';

type UserProfileNameProps = {
  name: string;
  openId?: string;
  className?: string;
};

const UserProfileName: React.FC<UserProfileNameProps> = ({ name, openId, className }) => {
  const [open, setOpen] = useState(false);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<{ unmount?: () => void } | null>(null);

  useEffect(() => {
    if (!open || !openId || !mountRef.current) return;
    const ready = initUserProfileFromWindow();
    if (!ready) return;
    instanceRef.current = renderUserProfile(openId, mountRef.current);
    return () => {
      instanceRef.current?.unmount?.();
      instanceRef.current = null;
    };
  }, [open, openId]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      instanceRef.current?.unmount?.();
      instanceRef.current = null;
    } else if (!initUserProfileFromWindow()) {
      return;
    }
    setOpen(nextOpen);
  };

  if (!openId) {
    return <span className={className}>{name || '-'}</span>;
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('text-primary underline underline-offset-2', className)}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {name || '-'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-2">
        <div ref={mountRef} />
      </PopoverContent>
    </Popover>
  );
};

const RemindersTab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'unfinished' | 'finished'>('unfinished');
  const [unfinishedReminders, setUnfinishedReminders] = useState<UnfinishedReminderItem[]>([]);
  const [finishedReminders, setFinishedReminders] = useState<FinishedReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());

  const loadReminders = useCallback(async () => {
    setLoading(true);
    try {
      const [unfinished, finished] = await Promise.all([
        dataService.getUnfinishedReminders(),
        dataService.getFinishedReminders(),
      ]);
      setUnfinishedReminders(unfinished);
      setFinishedReminders(finished);
    } catch (error) {
      console.error('加载提醒数据失败:', error);
      toast.error('加载提醒数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleConfirmFollowUp = async (projectId: string) => {
    setConfirmingIds(prev => new Set(prev).add(projectId));
    try {
      const success = await dataService.confirmFollowUp(projectId);
      if (success) {
        toast.success('已确认跟进，项目将从列表中移除');
        // 重新加载数据以刷新列表
        await loadReminders();
      } else {
        toast.error('确认跟进失败');
      }
    } catch (error) {
      console.error('确认跟进失败:', error);
      toast.error('确认跟进失败');
    } finally {
      setConfirmingIds(prev => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  };

  const getReminderBadge = (level: ReminderLevel) => {
    switch (level) {
      case 'red':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
            红色提醒
          </Badge>
        );
      case 'yellow':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
            黄色提醒
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30 text-xs">
            普通提醒
          </Badge>
        );
    }
  };

  const getStageBadgeClass = (stage: string) => {
    switch (stage) {
      case 'POC':
        return 'bg-warning/10 text-warning border-warning/30';
      case '谈判':
        return 'bg-success/10 text-success border-success/30';
      case '方案&报价':
        return 'bg-primary/10 text-primary border-primary/30';
      case '需求确认':
        return 'bg-info/10 text-info border-info/30';
      default:
        return '';
    }
  };

  const getProjectTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'POC':
        return 'bg-warning/10 text-warning border-warning/30';
      case '签单':
        return 'bg-success/10 text-success border-success/30';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  const totalReminders = unfinishedReminders.length + finishedReminders.length;

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            提醒预览
          </CardTitle>
          <CardDescription>
            系统将在每日早上 10:00 向 BD 发送汇总提醒通知
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="text-lg font-semibold">{totalReminders}</span>
              <span className="text-muted-foreground">个项目需要提醒</span>
            </div>
            <div className="text-sm text-muted-foreground">
              （未立项 {unfinishedReminders.length} / 已立项 {finishedReminders.length}）
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 子 Tab 切换 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'unfinished' | 'finished')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unfinished" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            未立项项目
            {unfinishedReminders.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {unfinishedReminders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="finished" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            已立项项目
            {finishedReminders.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {finishedReminders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 未立项项目列表 */}
        <TabsContent value="unfinished" className="mt-4">
          {unfinishedReminders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 opacity-30" />
                  <p>暂无需要提醒的未立项项目</p>
                  <p className="text-sm">所有项目都在正常跟进中</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* PC端表格 */}
              <div className="hidden md:block">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">项目名称</TableHead>
                          <TableHead className="w-[80px]">客户</TableHead>
                          <TableHead className="w-[60px]">BD</TableHead>
                          <TableHead className="w-[70px]">项目类别</TableHead>
                          <TableHead className="w-[80px]">项目阶段</TableHead>
                          <TableHead className="w-[90px]">最近更新</TableHead>
                          <TableHead className="w-[90px]">下次跟进</TableHead>
                          <TableHead className="w-[80px]">提醒状态</TableHead>
                          <TableHead className="w-[80px]">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unfinishedReminders.map(item => (
                          <TableRow key={item.projectId}>
                            <TableCell className="max-w-[200px] truncate font-medium" title={item.projectName}>
                              {item.projectName}
                            </TableCell>
                            <TableCell>{item.shortName}</TableCell>
                            <TableCell>
                              <UserProfileName name={item.bd || '-'} openId={item.bdOpenId} />
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-xs', getProjectTypeBadgeClass(item.projectType))}>
                                {item.projectType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-xs', getStageBadgeClass(item.stage))}>
                                {item.stage}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDateSafe(item.lastUpdateDate) || '-'}
                              <div className="text-destructive">({item.daysSinceUpdate}天前)</div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDateSafe(item.nextFollowDate) || '-'}
                            </TableCell>
                            <TableCell>
                              {getReminderBadge(item.reminderLevel)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={confirmingIds.has(item.projectId)}
                                  onCheckedChange={() => handleConfirmFollowUp(item.projectId)}
                                  disabled={confirmingIds.has(item.projectId)}
                                />
                                <span className="text-xs text-muted-foreground">已跟进</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* 移动端卡片 */}
              <div className="md:hidden space-y-3">
                {unfinishedReminders.map(item => (
                  <Card key={item.projectId}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm line-clamp-2">{item.projectName}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.shortName} - <UserProfileName name={item.bd || '-'} openId={item.bdOpenId} />
                          </div>
                        </div>
                        {getReminderBadge(item.reminderLevel)}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className={cn('text-xs', getProjectTypeBadgeClass(item.projectType))}>
                          {item.projectType}
                        </Badge>
                        <Badge variant="outline" className={cn('text-xs', getStageBadgeClass(item.stage))}>
                          {item.stage}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          更新: {formatDateSafe(item.lastUpdateDate) || '-'}
                          <span className="text-destructive">({item.daysSinceUpdate}天前)</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          跟进: {formatDateSafe(item.nextFollowDate) || '-'}
                        </span>
                      </div>

                      <div className="flex items-center justify-end mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfirmFollowUp(item.projectId)}
                          disabled={confirmingIds.has(item.projectId)}
                          className="h-8 text-xs"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          确认已跟进
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* 已立项项目列表 */}
        <TabsContent value="finished" className="mt-4">
          {finishedReminders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 opacity-30" />
                  <p>暂无需要提醒的已立项项目</p>
                  <p className="text-sm">所有项目结束时间都在 7 天以后</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* PC端表格 */}
              <div className="hidden md:block">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">项目名称</TableHead>
                          <TableHead className="w-[80px]">客户</TableHead>
                          <TableHead className="w-[60px]">BD</TableHead>
                          <TableHead className="w-[70px]">项目类别</TableHead>
                          <TableHead className="w-[80px]">项目阶段</TableHead>
                          <TableHead className="w-[100px]">项目结束时间</TableHead>
                          <TableHead className="w-[80px]">提醒状态</TableHead>
                          <TableHead className="w-[80px]">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {finishedReminders.map(item => (
                          <TableRow key={item.dealId}>
                            <TableCell className="max-w-[200px] truncate font-medium" title={item.projectName}>
                              {item.projectName}
                            </TableCell>
                            <TableCell>{item.shortName}</TableCell>
                            <TableCell>
                              <UserProfileName name={item.bd || '-'} openId={item.bdOpenId} />
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-xs', getProjectTypeBadgeClass(item.projectType))}>
                                {item.projectType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-xs', getStageBadgeClass(item.stage))}>
                                {item.stage}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div>{formatDateSafe(item.projectEndDate) || '-'}</div>
                              <div className={cn(
                                item.daysUntilEnd < 0 ? 'text-destructive' :
                                item.daysUntilEnd === 0 ? 'text-warning' : 'text-muted-foreground'
                              )}>
                                {item.daysUntilEnd < 0
                                  ? `(已过期 ${Math.abs(item.daysUntilEnd)} 天)`
                                  : item.daysUntilEnd === 0
                                    ? '(今天到期)'
                                    : `(还剩${item.daysUntilEnd}天)`}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getReminderBadge(item.reminderLevel)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={confirmingIds.has(item.projectId)}
                                  onCheckedChange={() => handleConfirmFollowUp(item.projectId)}
                                  disabled={confirmingIds.has(item.projectId)}
                                />
                                <span className="text-xs text-muted-foreground">已跟进</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* 移动端卡片 */}
              <div className="md:hidden space-y-3">
                {finishedReminders.map(item => (
                  <Card key={item.dealId}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm line-clamp-2">{item.projectName}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.shortName} - <UserProfileName name={item.bd || '-'} openId={item.bdOpenId} />
                          </div>
                        </div>
                        {getReminderBadge(item.reminderLevel)}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className={cn('text-xs', getProjectTypeBadgeClass(item.projectType))}>
                          {item.projectType}
                        </Badge>
                        <Badge variant="outline" className={cn('text-xs', getStageBadgeClass(item.stage))}>
                          {item.stage}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 mt-3 text-xs">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>结束时间: {formatDateSafe(item.projectEndDate) || '-'}</span>
                        <span className={cn(
                          item.daysUntilEnd < 0 ? 'text-destructive' :
                          item.daysUntilEnd === 0 ? 'text-warning' : 'text-muted-foreground'
                        )}>
                          {item.daysUntilEnd < 0
                            ? `(已过期 ${Math.abs(item.daysUntilEnd)} 天)`
                            : item.daysUntilEnd === 0
                              ? '(今天到期)'
                              : `(还剩${item.daysUntilEnd}天)`}
                        </span>
                      </div>

                      <div className="flex items-center justify-end mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfirmFollowUp(item.projectId)}
                          disabled={confirmingIds.has(item.projectId)}
                          className="h-8 text-xs"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          确认已跟进
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* 提醒规则说明 */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="text-xs text-muted-foreground space-y-2">
            <p className="font-medium">📋 提醒规则说明：</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium mb-1">未立项项目：</p>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  <li>仅对 <strong>POC、签单</strong> 类别启用提醒</li>
                  <li><strong>FA、丢单</strong> 阶段不设提醒</li>
                  <li>每 <strong>4 个自然日</strong> 触发提醒</li>
                  <li>超过 7 天未更新 → 黄色提醒</li>
                  <li>超过 14 天未更新 → 红色提醒</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">已立项项目：</p>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  <li>距离结束 1-7 天 → 普通提醒</li>
                  <li>结束时间 = 今日 → 黄色提醒</li>
                  <li>已过结束时间 → 红色提醒</li>
                </ul>
              </div>
            </div>
            <p className="mt-3">📢 <strong>飞书通知：</strong>系统将在每日早上 10:00 向各 BD 发送汇总提醒（当前为模拟功能）</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RemindersTab;
