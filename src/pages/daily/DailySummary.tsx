import React, { useState, useMemo } from 'react';
import { projectDB } from '@/data/projects';
import { dailyDB } from '@/data/daily';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, ClipboardList, Trash2 } from 'lucide-react';
import { COMMUNICATION_DURATIONS } from '@/data/options';
import { DAILY_SUMMARY_COLUMNS } from '@/types/bd';
import type { DailySummary as DailySummaryType } from '@/types';
// 飞书时间戳兜底展示
import { formatDateSafe } from '@/lib/date';

const DailySummary: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [communicationDuration, setCommunicationDuration] = useState('');
  const [taskSummary, setTaskSummary] = useState('');

  const projects = projectDB.getAll();
  const projectOptions = projects.map(p => p.projectName);

  const todaySummaries = useMemo(() => {
    return dailyDB.getByDate(date);
  }, [date]);

  const allSummaries = useMemo(() => {
    return dailyDB.getAll().sort((a, b) => b.date.localeCompare(a.date));
  }, []);

  const handleProjectChange = (value: string) => {
    const project = projects.find(p => p.projectName === value);
    if (project) {
      setProjectId(project.id);
      setProjectName(project.projectName);
    }
  };

  const handleSubmit = () => {
    if (!projectId) {
      toast.error('请选择今日对接项目');
      return;
    }
    if (!communicationDuration) {
      toast.error('请选择今日沟通时长');
      return;
    }
    if (!taskSummary.trim()) {
      toast.error('请输入今日任务总结');
      return;
    }

    dailyDB.create({
      date,
      projectId,
      projectName,
      communicationDuration,
      taskSummary,
    });

    toast.success('复盘记录已保存');
    
    // 重置表单
    setProjectId('');
    setProjectName('');
    setCommunicationDuration('');
    setTaskSummary('');
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条复盘记录吗？')) {
      dailyDB.delete(id);
      toast.success('记录已删除');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">每日复盘</h1>
        <p className="mt-1 text-muted-foreground">记录每日项目对接情况和任务总结</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 新增复盘表单 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              新增复盘记录
            </CardTitle>
            <CardDescription>填写今日项目对接情况</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">日期</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>今日对接项目 *</Label>
              <SearchableSelect
                options={projectOptions}
                value={projectName}
                onChange={handleProjectChange}
                placeholder="搜索并选择项目"
                searchPlaceholder="输入项目名称..."
                emptyText="未找到项目"
              />
            </div>

            <div className="space-y-2">
              <Label>今日沟通时长 *</Label>
              <Select value={communicationDuration} onValueChange={setCommunicationDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNICATION_DURATIONS.map(duration => (
                    <SelectItem key={duration} value={duration}>
                      {duration}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskSummary">今日任务总结 *</Label>
              <Textarea
                id="taskSummary"
                placeholder="请输入今日任务总结..."
                value={taskSummary}
                onChange={e => setTaskSummary(e.target.value)}
                rows={4}
              />
            </div>

            <Button onClick={handleSubmit} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              保存复盘记录
            </Button>
          </CardContent>
        </Card>

        {/* 今日复盘记录 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {date === new Date().toISOString().split('T')[0]
                ? '今日'
                : (formatDateSafe(date) || date)} 复盘记录
            </CardTitle>
            <CardDescription>
              共 {todaySummaries.length} 条记录
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaySummaries.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
                <ClipboardList className="mb-2 h-8 w-8" />
                <p>暂无复盘记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todaySummaries.map(summary => (
                  <div
                    key={summary.id}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {summary.projectName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          沟通时长：{summary.communicationDuration}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(summary.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-sm text-foreground">{summary.taskSummary}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 历史复盘记录 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>历史复盘记录</CardTitle>
          <CardDescription>查看所有复盘记录</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {DAILY_SUMMARY_COLUMNS.map((c) => (
                    <TableHead key={c.key} className={c.headClassName}>
                      {c.title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allSummaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <p className="text-muted-foreground">暂无历史记录</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  allSummaries.map(summary => (
                    <TableRow key={summary.id}>
                      <TableCell>{formatDateSafe(summary.date) || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {summary.projectName}
                      </TableCell>
                      <TableCell>{summary.communicationDuration}</TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {summary.taskSummary}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(summary.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailySummary;
