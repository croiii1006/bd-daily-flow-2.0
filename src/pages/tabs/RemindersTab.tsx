import React, { useState, useEffect } from 'react';
import { dataService } from '@/services/dataService';
import type { ReminderItem } from '@/types/bd';
import { PROJECT_STAGE_BADGE_CLASS, REMINDER_TABLE_COLUMNS } from '@/types/bd';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bell, AlertTriangle, Calendar, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const RemindersTab: React.FC = () => {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    setLoading(true);
    const data = await dataService.getReminderProjects();
    setReminders(data);
    setLoading(false);
  };

  const handleSendReminder = async (projectId: string) => {
    const success = await dataService.sendFollowupReminder(projectId);
    if (success) {
      toast.success('提醒已发送（模拟）');
    } else {
      toast.error('发送失败');
    }
  };

  const getStageBadgeClass = (stage: string) => {
    return (PROJECT_STAGE_BADGE_CLASS as Record<string, string>)[stage] || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 说明卡片 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            提醒预览
          </CardTitle>
          <CardDescription>
            以下项目需要跟进：阶段为 未开始/进行中/FA/停滞，且下次跟进日期已过或超过5天未更新
          </CardDescription>
        </CardHeader>
      </Card>

      {reminders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Bell className="h-12 w-12 opacity-30" />
              <p>暂无需要提醒的项目</p>
              <p className="text-sm">所有关键阶段项目都在正常跟进中</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 统计 */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <span className="text-lg font-semibold">{reminders.length}</span>
                  <span className="text-muted-foreground">个项目需要提醒</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PC端表格 */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {REMINDER_TABLE_COLUMNS.map((c) => (
                        <TableHead key={c.key} className={c.headClassName}>
                          {c.title}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reminders.map(reminder => (
                      <TableRow key={reminder.projectId}>
                        <TableCell className="max-w-[200px] truncate" title={reminder.projectName}>
                          {reminder.projectName}
                        </TableCell>
                        <TableCell>{reminder.shortName}</TableCell>
                        <TableCell>{reminder.bd}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', getStageBadgeClass(reminder.stage))}>
                            {reminder.stage}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {reminder.lastUpdateDate || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {reminder.nextFollowDate || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                            {reminder.reason}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendReminder(reminder.projectId)}
                            className="h-7 text-xs"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            提醒
                          </Button>
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
            {reminders.map(reminder => (
              <Card key={reminder.projectId}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm line-clamp-2">{reminder.projectName}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {reminder.shortName} · {reminder.bd}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('text-xs shrink-0 ml-2', getStageBadgeClass(reminder.stage))}>
                      {reminder.stage}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      更新: {reminder.lastUpdateDate || '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      跟进: {reminder.nextFollowDate || '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                      {reminder.reason}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendReminder(reminder.projectId)}
                      className="h-7 text-xs"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      发送提醒
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* 说明 */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 <strong>提醒逻辑：</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li>项目阶段为 未开始、进行中、FA 或 停滞</li>
              <li>下次跟进日期已过，或最近更新距今超过 5 天</li>
            </ul>
            <p className="mt-2">📢 <strong>发送提醒</strong>功能目前为模拟，未来可接入飞书消息 API</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RemindersTab;
