import React, { useState, useEffect } from 'react';
import { dataService } from '@/services/dataService';
import type { Project, ProjectStage, ProjectPriority } from '@/types/bd';
import {
  BD_OPTIONS,
  MONTH_OPTIONS,
  PROJECT_STAGE_BADGE_CLASS,
  PROJECT_STAGE_OPTIONS,
  PROJECT_TABLE_COLUMNS,
  PROJECT_TYPE_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
} from '@/config/bdOptions';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Calendar, LayoutGrid, Table2, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';

const ProjectsTab: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [bdFilter, setBdFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [pcView, setPcView] = useState<'table' | 'cards'>('table');

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchKeyword, stageFilter, typeFilter, priorityFilter, bdFilter, monthFilter]);

  const loadProjects = async () => {
    const data = await dataService.getAllProjects();
    setProjects(data);
  };

  const filterProjects = () => {
    let result = [...projects];

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter((p) =>
        (p.projectName || '').toLowerCase().includes(keyword) ||
        (p.shortName || '').toLowerCase().includes(keyword),
      );
    }

    if (stageFilter !== 'all') {
      result = result.filter((p) => p.stage === stageFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter((p) => p.projectType === typeFilter);
    }

    if (priorityFilter !== 'all') {
      result = result.filter((p) => p.priority === priorityFilter);
    }

    if (bdFilter !== 'all') {
      result = result.filter((p) => p.bd === bdFilter);
    }

    if (monthFilter !== 'all') {
      result = result.filter((p) => p.month === monthFilter);
    }

    setFilteredProjects(result);
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setShowDetail(true);
  };

  const getStageBadgeClass = (stage: ProjectStage) => PROJECT_STAGE_BADGE_CLASS[stage] || '';

  const getPriorityBadgeVariant = (priority: ProjectPriority) => {
    switch (priority) {
      case 'P0':
        return 'default';
      case 'P1':
        return 'secondary';
      case 'P2':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索项目名称或客户..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="进度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部进度</SelectItem>
                  {PROJECT_STAGE_OPTIONS.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="类别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类别</SelectItem>
                  {PROJECT_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="优先级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部优先级</SelectItem>
                  {PROJECT_PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={bdFilter} onValueChange={setBdFilter}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="BD" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部BD</SelectItem>
                  {BD_OPTIONS.map((bd) => (
                    <SelectItem key={bd} value={bd}>
                      {bd}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="月份" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部月份</SelectItem>
                  {MONTH_OPTIONS.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* PC 视图切换：表格 / 卡片 */}
              <div className="hidden md:flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  size="sm"
                  variant={pcView === 'table' ? 'default' : 'outline'}
                  onClick={() => setPcView('table')}
                >
                  <Table2 className="h-4 w-4 mr-2" />
                  表格
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={pcView === 'cards' ? 'default' : 'outline'}
                  onClick={() => setPcView('cards')}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  卡片
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 项目表格 - PC端 */}
      {pcView === 'table' && (
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {PROJECT_TABLE_COLUMNS.map((c) => (
                    <TableHead key={c.key} className={c.headClassName}>
                      {c.title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow
                    key={project.projectId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleProjectClick(project)}
                  >
                    <TableCell className="font-mono text-xs">{project.projectId}</TableCell>
                    <TableCell className="text-xs">{project.customerId || '-'}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={project.projectName}>
                      {project.projectName || '-'}
                    </TableCell>
                    <TableCell className="text-xs">{project.shortName || '-'}</TableCell>
                    <TableCell className="text-xs">{project.campaignName || '-'}</TableCell>
                    <TableCell className="text-xs">{project.deliverableName || '-'}</TableCell>
                    <TableCell className="text-xs">{project.month || '-'}</TableCell>
                    <TableCell className="text-xs">{project.serviceType || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {project.projectType || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', getStageBadgeClass(project.stage))}>
                        {project.stage || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityBadgeVariant(project.priority)} className="text-xs">
                        {project.priority || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{project.expectedAmount ?? '-'}</TableCell>
                    <TableCell className="text-xs">{project.bd || '-'}</TableCell>
                    <TableCell className="text-xs">{project.am || '-'}</TableCell>
                    <TableCell className="text-xs">{project.totalBdHours ?? '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {project.lastUpdateDate || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {project.nextFollowDate || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      )}

      {/* 项目卡片 - PC端 */}
      {pcView === 'cards' && (
        <div className="hidden md:grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card
              key={project.projectId}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => handleProjectClick(project)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm line-clamp-2">
                      {project.projectName || '-'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      {project.projectId}
                    </div>
                  </div>
                  <Badge
                    variant={getPriorityBadgeVariant(project.priority)}
                    className="text-xs shrink-0"
                  >
                    {project.priority || '-'}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">
                    {project.shortName || '-'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {project.serviceType || '-'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', getStageBadgeClass(project.stage))}
                  >
                    {project.stage || '-'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span>BD: {project.bd || '-'}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {project.nextFollowDate || '未设置'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 项目卡片 - 移动端 */}
      <div className="md:hidden space-y-3">
        {filteredProjects.map((project) => (
          <Card
            key={project.projectId}
            className="cursor-pointer"
            onClick={() => handleProjectClick(project)}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-sm line-clamp-2">{project.projectName}</div>
                  <div className="text-xs text-muted-foreground mt-1">{project.projectId}</div>
                </div>
                <Badge variant={getPriorityBadgeVariant(project.priority)} className="text-xs shrink-0 ml-2">
                  {project.priority}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="text-xs">
                  {project.shortName}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {project.serviceType}
                </Badge>
                <Badge variant="outline" className={cn('text-xs', getStageBadgeClass(project.stage))}>
                  {project.stage}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>BD: {project.bd}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {project.nextFollowDate || '未设置'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">暂无项目数据</div>
      )}

      {/* 详情弹窗 */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              {selectedProject?.projectName || '项目详情'}
            </DialogTitle>
          </DialogHeader>

          {selectedProject && (
            <ScrollArea className="max-h-[calc(90vh-100px)]">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">基本信息</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">项目ID：</span>
                        <span className="font-mono">{selectedProject.projectId || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">客户ID：</span>
                        <span className="font-mono">{selectedProject.customerId || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">项目名称：</span>
                        <span>{selectedProject.projectName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">客户/部门简称：</span>
                        <span>{selectedProject.shortName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">服务类型：</span>
                        <span>{selectedProject.serviceType || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">项目类别：</span>
                        <Badge variant="outline" className="ml-2">
                          {selectedProject.projectType || '-'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">项目进度：</span>
                        <Badge
                          variant="outline"
                          className={cn('ml-2', getStageBadgeClass(selectedProject.stage))}
                        >
                          {selectedProject.stage || '-'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">优先级：</span>
                        <Badge variant={getPriorityBadgeVariant(selectedProject.priority)} className="ml-2">
                          {selectedProject.priority || '-'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">所属年月：</span>
                        <span>{selectedProject.month || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">活动名称：</span>
                        <span>{selectedProject.campaignName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">交付名称：</span>
                        <span>{selectedProject.deliverableName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">BD：</span>
                        <span>{selectedProject.bd || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">AM：</span>
                        <span>{selectedProject.am || '-'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">金额 / 时间</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">预估项目金额：</span>
                        <span>{selectedProject.expectedAmount ?? '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">累计商务时间（hr）：</span>
                        <span>{selectedProject.totalBdHours ?? '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">最新更新日期：</span>
                        <span>{selectedProject.lastUpdateDate || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">下次跟进日期：</span>
                        <span>{selectedProject.nextFollowDate || '-'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsTab;
